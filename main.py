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

app = FastAPI(title="FamilyBot - 家庭管家")
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

# 初始 JSON 数据（增加 usage 字段，暂留空）
INIT_JSON_DATA = [
  {"name": "肠炎宁片", "count": "1盒", "location": "儿童房吊柜右大", "expire_date": "2028/8/1", "usage": ""},
  {"name": "阿莫西林胶囊", "count": "", "location": "儿童房吊柜右大", "expire_date": "", "usage": ""},
  {"name": "小柴胡颗粒", "count": "1盒", "location": "儿童房吊柜右大", "expire_date": "2028/11/5", "usage": ""},
  {"name": "奥司他韦", "count": "1盒", "location": "儿童房吊柜右大", "expire_date": "2029/11/6", "usage": ""},
  {"name": "布洛芬", "count": "2板", "location": "儿童房吊柜左小", "expire_date": "2028/8/4", "usage": ""},
  {"name": "扑热息痛", "count": "1盒", "location": "儿童房吊柜左小", "expire_date": "2028/9/21", "usage": ""},
  {"name": "氨咖黄敏胶囊", "count": "1盒", "location": "儿童房吊柜左小", "expire_date": "2027/11/1", "usage": ""},
  {"name": "红霉素软膏", "count": "1支", "location": "儿童房吊柜左小", "expire_date": "2030/5/1", "usage": ""},
  {"name": "水杨酸软膏", "count": "3支", "location": "儿童房吊柜左小", "expire_date": "2026/10/1", "usage": ""},
  {"name": "硝酸咪康唑乳膏", "count": "1支", "location": "儿童房吊柜左小", "expire_date": "2030/6/3", "usage": ""},
  {"name": "绷带", "count": "1卷", "location": "儿童房吊柜左小", "expire_date": "2028/3/28", "usage": ""},
  {"name": "棉签", "count": "", "location": "儿童房吊柜左小", "expire_date": "", "usage": ""},
  {"name": "头孢克洛分散片", "count": "8片", "location": "儿童房吊柜右大", "expire_date": "2027/11/1", "usage": ""},
  {"name": "西瓜霜含片", "count": "一盒", "location": "儿童房吊柜右大", "expire_date": "2028/12/28", "usage": ""}
]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # 创建增加 usage (用法用量) 字段的药品表
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
    
    cursor.execute("SELECT COUNT(*) FROM medicines")
    if cursor.fetchone()[0] == 0:
        for item in INIT_JSON_DATA:
            cursor.execute(
                "INSERT INTO medicines (name, count, location, expire_date, usage) VALUES (?, ?, ?, ?, ?)",
                (item["name"], item["count"], item["location"], item["expire_date"], item["usage"])
            )
        conn.commit()
    conn.close()

init_db()

def get_db_medicines():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, count, location, expire_date, usage, eff FROM medicines")
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/index.html")
async def read_index_html():
    return RedirectResponse(url="/static/index.html")

@app.get("/api/chat")
async def chat_with_bot(query: str):
    db_medicines = get_db_medicines()
    
    med_list_str = ""
    for idx, item in enumerate(db_medicines, 1):
        cnt = item['count'] if item['count'] else "未标注"
        exp = item['expire_date'] if item['expire_date'] else "未标注"
        loc = item['location'] if item['location'] else "未知位置"
        usg = item['usage'] if item['usage'] else "无明确标注"
        med_list_str += f"{idx}. {item['name']} | 数量: {cnt} | 位置: {loc} | 有效期: {exp} | 用法用量: {usg}\n"

    system_prompt = f"""你是一个贴心的家庭健康与药箱管家。
以下是用户家庭药箱中【当前从本地数据库检索到的现有药品清单】：
---
{med_list_str}
---
请根据用户的提问，结合上述药箱清单给出合理的解答：
1. 回答时，如果推荐了某种药，**告知用户该药品存放的精确位置**以及数据库中的**用法用量**（如果有的话）。
2. 如果某种药未标注用法用量或有效期，提醒用户仔细阅读药品说明书。
3. 保持回答温和、简洁、专业，强调用药安全。"""

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
        return {"reply": f"请求失败，错误原因: {str(e)}"}

# 📋 获取所有药品清单
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

# ➕ 录入新药品 API
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
        return {"status": "success", "message": f"成功录入药品: {name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✏️ 修改现有药品 API（支持更新用法用量、位置、数量、有效期等）
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
        return {"status": "success", "message": "药品信息更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)