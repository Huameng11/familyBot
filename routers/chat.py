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
1. 丰富排版规范：全力拥抱 Markdown 语法！你可以自由使用粗体、斜体、无序列表（-）、有序列表及表格来美化结构。
2. 符号与高亮徽章（极其重要）：
   - 请在回答中适当融入贴切的 Emoji 表情符号（如 💊, 📦, 🏠, ⚠️, ✅），让界面富有现代感。
   - 重点名词、状态或需要强调的内容（例如：药品位置、剩余数量、过期的警告），请使用行内代码反引号（即 `内容`）进行包裹，这样前端会自动将其渲染为彩色高亮徽章。
3. 渐进式回答策略：
   - 当用户泛泛提问（如：“家里有感冒药吗？”）时，给出明确结论，并使用列表仅输出【药品名称】、行内代码包裹的【数量】与【存放位置】。
   - 绝对不要在普通询问中主动输出有效期、用法用量等长篇大论。
   - 回答结尾附带一句短问引导（如：“需要我为您查看哪款药的具体用量或有效期吗？ 🤔”）。
   - 只有当用户明确指定某款药或询问具体用法时，才输出完整明细。
4. 语言与排版规范：
   - 语言极致简洁，拒绝废话，直奔主题。分点换行，保持视窗美观。"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"大管家思考失败，请检查密钥或网络: {str(e)}"}