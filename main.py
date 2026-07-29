import os
import asyncio
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from openai import AsyncOpenAI

app = FastAPI(title="FamilyBot - 家庭管家")

# ------------------------------------------------------------------
# 🔑 大模型配置（这里以智谱/DeepSeek/阿里等兼容 API 为例）
# 请替换为你自己的 API_KEY 以及相应的 BASE_URL
# ------------------------------------------------------------------
API_KEY = ""  # 👈 填入你的 API Key
BASE_URL = ""  # 智谱示例；若用 DeepSeek 改为 https://api.deepseek.com
MODEL_NAME = ""  # 智谱免费/低成本模型；若用 DeepSeek 改为 deepseek-chat


client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)
DB_PATH = "D:/study/pythonProjects/家庭管家/medicine.db" # "/home/pi/familyBot/medicine.db"

# ------------------------------------------------------------------
# 💾 数据库初始化逻辑
# ------------------------------------------------------------------
def init_db():
    """初始化 SQLite 数据库，创建药品表"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            eff TEXT,
            expiry TEXT,
            stock INTEGER DEFAULT 1
        )
    ''')
    
    # 如果表是空的，插入几条初始数据方便测试
    cursor.execute("SELECT COUNT(*) FROM medicines")
    if cursor.fetchone()[0] == 0:
        initial_data = [
            ("布洛芬缓释胶囊", "解热镇痛，用于感冒发热、头痛、关节痛", "2027-12", 2),
            ("对乙酰氨基酚片", "普通感冒或流感引起的发热，也用于缓解轻至中度疼痛", "2026-05", 1),
            ("蒙脱石散", "成人及儿童急、慢性腹泻", "2028-01", 3)
        ]
        cursor.executemany("INSERT INTO medicines (name, eff, expiry, stock) VALUES (?, ?, ?, ?)", initial_data)
        conn.commit()
    conn.close()

# 执行数据库初始化
init_db()

def get_db_medicines():
    """从数据库中读取所有药品数据"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 让返回结果可以通过列名访问
    cursor = conn.cursor()
    cursor.execute("SELECT name, eff, expiry, stock FROM medicines WHERE stock > 0")
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

# 🤖 核心：AI 聊天接口（已改为读取真实 SQLite 数据库）
@app.get("/api/chat")
async def chat_with_bot(query: str):
    # 从真正的 SQLite 数据库提取当前药品
    db_medicines = get_db_medicines()
    
    med_list_str = ""
    for idx, item in enumerate(db_medicines, 1):
        med_list_str += f"{idx}. {item['name']} | 功效: {item['eff']} | 有效期: {item['expiry']} | 库存: {item['stock']}盒\n"

    system_prompt = f"""你是一个贴心的家庭健康与药箱管家。
以下是用户家庭药箱中【当前从本地数据库检索到的现有药品清单】：
---
{med_list_str}
---
请根据用户的提问，结合上述药箱清单给出合理的解答。"""

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

# ➕ 新增：手机端录入药品的 API 接口
@app.post("/api/add_medicine")
async def add_medicine(name: str, eff: str, expiry: str, stock: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medicines (name, eff, expiry, stock) VALUES (?, ?, ?, ?)",
            (name, eff, expiry, stock)
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功录入药品: {name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

