import os
import sqlite3
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from openai import AsyncOpenAI

load_dotenv()

API_KEY = os.getenv("FAMILYBOT_API_KEY")
BASE_URL = os.getenv("FAMILYBOT_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/")
MODEL_NAME = os.getenv("FAMILYBOT_MODEL_NAME", "glm-4-flash")
DB_PATH = os.getenv("FAMILYBOT_DB_PATH", "/home/pi/familyBot/medicine.db")

app = FastAPI(title="FamilyBot - 家庭管家大中台")
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

# ------------------------------------------------------------------
# 💾 数据库初始化逻辑
# ------------------------------------------------------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # 1. 药品表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            count TEXT,
            location TEXT,
            expire_date TEXT,
            usage TEXT DEFAULT '',
            eff TEXT DEFAULT ''
        )
    ''')
    
    # 2. 预留：家庭物资仓库表 (以后激活)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS storage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            category TEXT,
            quantity TEXT,
            location TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

def get_db_medicines():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name, count, location, expire_date, usage FROM medicines")
    rows = cursor.fetchall()
    conn.close()
    return rows

# ------------------------------------------------------------------
# 📡 路由与 API 接口
# ------------------------------------------------------------------
@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/index.html")
async def read_index_html():
    return RedirectResponse(url="/static/index.html")

# 🤖 核心升级：全能家庭管家问答接口
@app.get("/api/chat")
async def chat_with_bot(query: str):
    # 读取各模块的数据（目前已接入药箱）
    db_medicines = get_db_medicines()
    
    med_list_str = ""
    for idx, item in enumerate(db_medicines, 1):
        cnt = item['count'] if item['count'] else "未标注"
        exp = item['expire_date'] if item['expire_date'] else "未标注"
        loc = item['location'] if item['location'] else "未知位置"
        usg = item['usage'] if item['usage'] else "无明确标注"
        med_list_str += f"{idx}. {item['name']} | 数量: {cnt} | 位置: {loc} | 有效期: {exp} | 用法用量: {usg}\n"

    # 构建超级管家 Prompt，为以后的仓库、密码预留提示
    system_prompt = f"""你是一个全能的家庭超级大管家智能体（FamilyBot）。你的职责是帮助主人管理家中的一切事务。

目前你已经接入了以下【家庭药品数据库】的信息：
---
{med_list_str}
---

【未来规划扩展（当前尚未接入数据，若主人问及，可委婉告知相关功能模块正在开发中）】：
- 家庭物资仓库（查询日常百货、囤货库存）
- 密码管理器（安全记录本地密码）

请根据主人的提问，智能判断其意图并给出合理的解答：
1. 如果主人问及健康、生病、找药或药品用法，请检索上述药品清单，并明确告知药品的【存放精确位置】和【用法用量】。
2. 主人的提问可能是日常聊天，请保持温和、专业、幽默且富有生活气息。回答要简洁，不要长篇大论。
3. 涉及到用药安全时，仍需进行善意提醒。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.7
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"管家大脑思考时出了点小状况: {str(e)}"}

# --- 药箱功能模块的 API（保持不变） ---
@app.get("/api/medicines")
async def get_all_medicines():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, count, location, expire_date, usage FROM medicines ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()
        return {"status": "success", "data": [dict(row) for row in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add_medicine")
async def add_medicine(name: str, count: str = "", location: str = "", expire_date: str = "", usage: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medicines (name, count, location, expire_date, usage) VALUES (?, ?, ?, ?, ?)",
            (name, count, location, expire_date, usage)
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": "成功录入"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update_medicine")
async def update_medicine(id: int, name: str, count: str = "", location: str = "", expire_date: str = "", usage: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE medicines SET name=?, count=?, location=?, expire_date=?, usage=? WHERE id=?",
            (name, count, location, expire_date, usage, id)
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": "更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)