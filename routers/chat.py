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

【核心输出规则与格式要求】：
1. 格式禁令：严禁在回答中使用任何 Markdown 加粗符号（即严禁出现 ** 符号）。
2. 信息准确性：
   - 涉及寻找药品或日常物资时，必须清晰、明确地告知主人物品的【精确存放位置】及当前数量。
   - 涉及账号密码、缴费户号、琐事日程查询时，严格依据备忘录内容准确回答，切勿编造。
3. 语言与排版规范：
   - 语言要极致简洁、亲切自然、专业得体，直奔主题，拒绝无意义的套话和客套。
   - 逻辑清晰，按要点分段，段落之间保持一行空行，方便移动端手机阅读。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"大管家思考失败，请检查密钥或网络: {str(e)}"}