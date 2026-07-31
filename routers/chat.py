from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import re
from openai import AsyncOpenAI
from config import API_KEY, BASE_URL, MODEL_NAME, DB_PATH
from database import (
    get_db_medicines, 
    get_db_storage, 
    get_db_memos, 
    get_db_chat_history, 
    get_db_calendars,
    get_db_recipes
)

router = APIRouter(tags=["AI Chat"])
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

# ================= 接口 1 & 2：聊天记录基础功能 (保持不变) =================
@router.get("/api/chat/history")
async def get_chat_history():
    try:
        rows = get_db_chat_history()
        return {"status": "success", "data": [dict(row) for row in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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


# ================= ⚡ 核心智能体增量功能：去闲聊化的防御性多意图路由 =================
async def analyze_intent(user_query: str) -> list:
    """
    第一阶段：判定意图模块列表。
    取消 general 分类。如果提问意图模糊或无法精准归类，允许返回空列表以触发全局兜底。
    """
    router_prompt = """你是一个高精度的家庭智能路由网关。请分析用户的提问，判断该提问可能需要调取哪些家庭数据库来提供支撑。

【可选模块与关联场景】：
- medicine : 身体不适、生病、寻找药品、保健品、保质期、用法用量。
- storage  : 找家里的任何物品、日用品、工具、物资存量、放哪了、购买记录。
- calendar : 生日、纪念日、行程安排、今天明天的事、日历提醒、时间规划。
- recipe   : 今晚吃啥、做饭、菜谱做法、食材搭配、辅食教程。
- memo     : 账号密码、户号、水电气、尺寸数据、待办事项等一切琐事。

【特殊指令】：
1. 允许同时输出多个模块（例如：medicine, storage）。
2. 如果问题非常模糊、无法归入上述任何一个模块，或者属于打招呼、泛泛提问，请直接返回“none”。
3. 请直接输出模块英文单词，多个请用逗号分隔，不要包含任何多余解释。

输出示例：
medicine, storage
"""
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": router_prompt}, {"role": "user", "content": user_query}],
            temperature=0.3,
            max_tokens=30
        )
        intent_output = response.choices[0].message.content.strip().lower()
        
        matched_modules = []
        if "medicine" in intent_output: matched_modules.append("medicine")
        if "storage" in intent_output: matched_modules.append("storage")
        if "calendar" in intent_output: matched_modules.append("calendar")
        if "recipe" in intent_output: matched_modules.append("recipe")
        if "memo" in intent_output: matched_modules.append("memo")
        
        # 🚀 核心逻辑：如果模型认为无法归类（返回 none 或为空），则触发下一阶段的“除菜谱外的全数据挂载”
        return matched_modules
        
    except Exception as e:
        print(f"⚠️ [Agent 路由异常] 意图分析抛错: {str(e)}")
        # 发生异常时，同样返回空列表以触发安全防御挂载
        return []


# 🛠️ 升级后的主接口：防御性并发检索问答
@router.get("/api/chat")
async def chat_with_bot(query: str):
    # 1. 实时写入用户提问
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("user", query))
        conn.commit()
    except Exception as e:
        pass
    finally:
        if 'conn' in locals(): conn.close()

    # 🚀 2. 执行路由分析
    target_modules = await analyze_intent(query)
    
    # 🚀 3. 核心改动：如果找不到合适分类（列表为空），直接强制调用除菜谱模块外的所有数据
    if not target_modules:
        target_modules = ["medicine", "storage", "calendar", "memo"]
        print(f"🧠 [Agent 智能网关] 无法精准分类，触发兜底防御：自动联合挂载【除菜谱外】的全部基础数据")
    else:
        print(f"🧠 [Agent 智能网关] 用户提问被成功关联至模块: {target_modules}")

    # 4. 按需或根据兜底策略拼接多表数据
    context_parts = []
    module_names_cn = []

    if "medicine" in target_modules:
        module_names_cn.append("智能药箱")
        db_medicines = get_db_medicines()
        if db_medicines:
            med_str = "\n".join([f"- {m['name']} | 数量:{m['count']} | 位置:{m['location']} | 有效期:{m['expire_date']} | 用法:{m['usage']}" for m in db_medicines])
            context_parts.append(f"【家庭药品清单】:\n{med_str}")

    if "storage" in target_modules:
        module_names_cn.append("家庭物资仓库")
        db_storage = get_db_storage()
        if db_storage:
            sto_str = "\n".join([f"- {s['item_name']}[{s['category']}] | 数量:{s['quantity']} | 位置:{s['location']} | 备注:{s['remark']}" for s in db_storage])
            context_parts.append(f"【家庭物资仓库清单】:\n{sto_str}")

    if "calendar" in target_modules:
        module_names_cn.append("家庭日历行程")
        db_calendars = get_db_calendars()
        if db_calendars:
            cal_str = "\n".join([f"- {c['event_date']} | {c['title']} | 分类:{c['category']} | 位置:{c['location']} | 提醒:{c['remind_time']} | 备注:{c['remark']}" for c in db_calendars])
            context_parts.append(f"【家庭日历与日程安排】:\n{cal_str}")

    # 菜谱模块只有在显式被命中时才会调入，绝不参与泛泛的兜底，防止大量步骤文本挤爆上下文
    if "recipe" in target_modules:
        module_names_cn.append("家庭菜谱")
        db_recipes = get_db_recipes()
        if db_recipes:
            rec_str = "\n".join([f"- {r['name']} | 分类:{r['category']} | 难度:{r['difficulty']} | 食材:{r['ingredients']} | 做法:{r['steps']}" for r in db_recipes])
            context_parts.append(f"【家庭菜谱清单】:\n{rec_str}")

    if "memo" in target_modules:
        module_names_cn.append("家庭备忘录")
        db_memos = get_db_memos()
        if db_memos:
            memo_str = "\n".join([f"- 事件/标题: {m['title']} | 详细内容: {m['content']}" for m in db_memos])
            context_parts.append(f"【家庭备忘录信息】:\n{memo_str}")

    # 整合上下文
    context_str = "\n\n".join(context_parts) if context_parts else "当前数据库内暂无相关匹配记录。"
    cn_names_str = "、".join(module_names_cn)

    # 5. 组装系统级 Prompt
    system_prompt = f"""你是一个全能的家庭超级大管家智能体（FamilyBot）。
系统目前已为您智能挂载并呈送了主人最新的【{cn_names_str}】相关数据。

{context_str}

【核心输出规则与格式要求】：
1. 丰富排版规范：全力拥抱 Markdown 语法！你可以自由使用粗体、斜体、无序列表（-）、有序列表及表格来美化结构。
2. 符号与高亮徽章（极其重要）：
   - 请在回答中适当融入贴切的 Emoji 表情符号，让界面富有现代感。
   - 如果一次需要列出多个数据，可以适当采用可视化程度更高的表格形式。
3. 动态应答策略：
   - 如果挂载了数据，请基于数据给出精准的回答。
   - 如果用户只是在说打招呼、闲聊等无关话题，你可以直接用大管家的身份配合已有的家庭数据进行有温度的互动。
4. 语言与排版规范：
   - 语言极致简洁，拒绝废话，直奔主题。分点换行，保持视窗美观。"""

    # 6. 向大模型发起最终的精准生成调用
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": query}],
            temperature=0.7
        )
        reply_content = response.choices[0].message.content

        # 7. 实时写入管家聊天历史
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("bot", reply_content))
            conn.commit()
        except Exception as e:
            pass
        finally:
            if 'conn' in locals(): conn.close()

        return {"reply": reply_content}
    except Exception as e:
        return {"reply": f"大管家思考失败，请检查密钥或网络: {str(e)}"}