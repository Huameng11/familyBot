from fastapi import APIRouter, HTTPException
import sqlite3
from openai import AsyncOpenAI
from config import API_KEY, BASE_URL, MODEL_NAME, DB_PATH
from database import get_db_medicines, get_db_storage, get_db_memos, get_db_chat_history

router = APIRouter(tags=["AI Chat"])
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

# 🚀 新增接口 1：获取历史聊天数据
@router.get("/api/chat/history")
async def get_chat_history():
    try:
        rows = get_db_chat_history()
        return {"status": "success", "data": [dict(row) for row in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 新增接口 2：一键清空聊天历史
@router.post("/api/chat/clear")
async def clear_chat_history():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_history")
        conn.commit()
        conn.close()
        return {"status": "success", "message": "聊天记录已成功清空"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🛠️ 升级主接口：增加消息实时持久化存储
@router.get("/api/chat")
async def chat_with_bot(query: str):
    # 1. 实时把用户的提问存入数据库
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("user", query))
        conn.commit()
    except Exception as e:
        print(f"写入用户聊天历史失败: {str(e)}")
    finally:
        if 'conn' in locals(): conn.close()

    # 2. 照常读取 RAG 数据库上下文
    db_medicines = get_db_medicines()
    med_str = "\n".join([f"- {m['name']} | 数量:{m['count']} | 位置:{m['location']} | 有效期:{m['expire_date']} | 用法:{m['usage']}" for m in db_medicines])
    
    db_storage = get_db_storage()
    sto_str = "\n".join([f"- {s['item_name']}[{s['category']}] | 数量:{s['quantity']} | 位置:{s['location']} | 备注:{s['remark']}" for s in db_storage])

    db_memos = get_db_memos()
    memo_str = "\n".join([f"- 事件/标题: {s['title']} | 详细内容: {s['content']}" for s in db_memos])

    system_prompt = f"""你是一个全能的家庭超级大管家智能体（FamilyBot）。
你目前已经成功接入了主人的【家庭药品数据库】、【家庭物资仓库数据库】和【家庭日常备忘录】。

【家庭药品清单】：
{med_str}

【家庭物资仓库清单】：
{sto_str}

【家庭备忘录信息】：
{memo_str}

【核心输出规则与格式要求】：
1. 丰富排版规范：全力拥抱 Markdown 语法！你可以自由使用粗体、斜体、无序列表（-）、有序列表及表格来美化结构。
2. 符号与高亮徽章（极其重要）：
   - 请在回答中适当融入贴切的 Emoji 表情符号（如 💊, 📦, 🏠, ⚠️, ✅），让界面富有现代感。
   - 如果一次需要列出多个药品或物品，可以适当采用可视化程度更高的表格形式。
3. 渐进式回答策略：
   - 当用户泛泛提问（如：“家里有感冒药吗？”）时，给出明确结论，并使用列表仅输出【药品名称】、行内代码包裹的【数量】与【存放位置】。
   - 绝对不要在普通询问中主动输出有效期、用法用量等长篇大论。
   - 回答结尾附带一句短问引导（如：“需要我为您查看哪款药的具体用量或有效期吗？ 🤔”）。
   - 只有当用户明确指定某款药或询问具体用法时，才输出完整明细。
   
4. 语言与排版规范：
   - 语言极致简洁，拒绝废话，直奔主题。分点换行，保持视窗美观。
5. 补充：
   以上所有要求不止针对药品回复，其余所有模块回复均适用。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7
        )
        reply_content = response.choices[0].message.content

        # 3. 实时把大管家的回复存入数据库
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("bot", reply_content))
            conn.commit()
        except Exception as e:
            print(f"写入管家聊天历史失败: {str(e)}")
        finally:
            if 'conn' in locals(): conn.close()

        return {"reply": reply_content}
    except Exception as e:
        return {"reply": f"大管家思考失败，请检查密钥或网络: {str(e)}"}