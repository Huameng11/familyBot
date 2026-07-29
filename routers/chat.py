from fastapi import APIRouter
from openai import AsyncOpenAI
from config import API_KEY, BASE_URL, MODEL_NAME
from database import get_db_medicines, get_db_storage, get_db_memos # 注入 get_db_memos

router = APIRouter(tags=["AI Chat"])
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

@router.get("/api/chat")
async def chat_with_bot(query: str):
    db_medicines = get_db_medicines()
    med_str = "\n".join([f"- {m['name']} | 数量:{m['count']} | 位置:{m['location']} | 有效期:{m['expire_date']} | 用法:{m['usage']}" for m in db_medicines])
    
    db_storage = get_db_storage()
    sto_str = "\n".join([f"- {s['item_name']}[{s['category']}] | 数量:{s['quantity']} | 位置:{s['location']} | 备注:{s['remark']}" for s in db_storage])

    # 加载备忘录数据给大模型
    db_memos = get_db_memos()
    memo_str = "\n".join([f"- 事件/标题: {s['title']} | 详细内容: {s['content']}" for s in db_memos])

    system_prompt = f"""你是一个全能的家庭超级大管家智能体（FamilyBot）。
你目前已经成功接入了主人的【家庭药品数据库】、【家庭物资仓库数据库】和【家庭日常备忘录】。

【家庭药品清单】：
{med_str}

【家庭物资仓库清单】：
{sto_str}

【家庭备忘录信息（包含各种账号、琐事、备忘记录）】：
{memo_str}

要求：
1. 涉及寻找药品或日常物资时，必须明确告知主人物品的存放精确位置。
2. 涉及家庭琐事、账号密码、备忘日程查询时，根据备忘录信息准确回答。
3. 语言要简洁、亲切、专业。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"大管家思考失败，请检查密钥或网络: {str(e)}"}