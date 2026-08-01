from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
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
from services.notifier import run_daily_morning_job


router = APIRouter(tags=["AI Chat"])
client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=20.0)

# ================= 接口 1 & 2：聊天记录基础功能 =================
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
    如果提问意图模糊或无法精准归类，允许返回空列表以触发全局兜底。
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
        
        return matched_modules
        
    except Exception as e:
        print(f"⚠️ [Agent 路由异常] 意图分析抛错: {str(e)}")
        return []


# 🛠️ 升级后的主接口：防御性并发检索 + 动态多轮上下文问答
@router.get("/api/chat")
async def chat_with_bot(query: str):
    # 1. 实时写入用户当前提问
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("user", query))
        conn.commit()
    except Exception as e:
        pass
    finally:
        if 'conn' in locals(): conn.close()

    # 🚀 2. 核心增量：捞取数据库内最近的对话记录，构建多轮记忆上下文
    history_messages = []
    try:
        raw_histories = get_db_chat_history()
        # 截取最近 10 条记录（约 5 轮对话）
        recent_histories = raw_histories[-10:] if len(raw_histories) > 10 else raw_histories
        
        for h in recent_histories:
            row_dict = dict(h)
            # 严格映射 OpenAI 角色定义: bot -> assistant
            role_map = "user" if row_dict["role"] == "user" else "assistant"
            
            # 过滤掉刚才刚写入数据库的当前问题，防止重复追加
            if role_map == "user" and row_dict["text"] == query:
                continue
            history_messages.append({"role": role_map, "content": row_dict["text"]})
    except Exception as e:
        print(f"⚠️ [Context] 对话历史上下文加载异常: {str(e)}")

    # 3. 执行意图路由分析
    target_modules = await analyze_intent(query)
    
    # 🚀 4. 智能意图继承机制：若当前提问太短/模糊（如追问“在哪个抽屉”），自动从上一条回复继承上下文意图
    if not target_modules and history_messages:
        last_bot_msg = ""
        for msg in reversed(history_messages):
            if msg["role"] == "assistant":
                last_bot_msg = msg["content"]
                break
        
        if last_bot_msg:
            if any(k in last_bot_msg for k in ["生日", "日程", "纪念日", "日历"]):
                target_modules.append("calendar")
            if any(k in last_bot_msg for k in ["药", "感冒", "头疼", "保质期", "用法"]):
                target_modules.append("medicine")
            if any(k in last_bot_msg for k in ["物资", "仓库", "放在", "位置", "剩"]):
                target_modules.append("storage")
            if any(k in last_bot_msg for k in ["备忘", "账号", "密码"]):
                target_modules.append("memo")

    # 5. 防御性兜底：如果依然无法精准分类，强制挂载【除菜谱外】的全部基础数据
    if not target_modules:
        target_modules = ["medicine", "storage", "calendar", "memo"]
        print(f"🧠 [Agent 智能网关] 触发兜底防御：自动联合挂载【除菜谱外】的全部基础数据")
    else:
        print(f"🧠 [Agent 智能网关] 提问命中/继承模块: {target_modules}")

    # 6. 按需拼接数据库多表数据
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

    # 菜谱仅在被明确关联时挂载，不参与泛化兜底
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

    context_str = "\n\n".join(context_parts) if context_parts else "当前数据库内暂无相关匹配记录。"
    cn_names_str = "、".join(module_names_cn)
    
    # 🚀 1. 在 API 触发时，实时获取树莓派的绝对时间
    from datetime import datetime
    now = datetime.now()
    current_date_str = now.strftime("%Y-%m-%d") # 用于和数据库的 YYYY-MM-DD 格式做硬匹配
    
    # 星期数字转中文
    week_map = {"0": "日", "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六"}
    current_week_cn = week_map.get(now.strftime("%w"), now.strftime("%w"))
    
    # 丰富的人类可读时间
    human_time_str = now.strftime(f"%Y年%m月%d日 星期{current_week_cn} %H:%M")

    # 🚀 2. 组装进全新的系统 Prompt 
    system_prompt = f"""你是一个全能的家庭超级大管家智能体（FamilyBot）。
    
【⚠️ 极其重要 - 核心时间锚点】：
- 当前绝对时间：{human_time_str}
- 标准对比日期：{current_date_str}

【🚨 时间计算硬性规则】：
1. 当主人询问“还有多久就到了”、“有没有过期”、“明天有什么安排”等时间相关问题时，必须严格以【标准对比日期（{current_date_str}）】作为今天，去计算与数据库中物品有效期或日程时间的差值。
2. 药品有效期超过标准对比日期即为过期，未超过则为安全，请精准计算剩余天数或月数，拒绝模糊脑补。

系统目前已为您智能挂载并呈送了主人最新的【{cn_names_str}】相关数据。

{context_str}

【核心输出规则与格式要求】：
1. 丰富排版规范：全力拥抱 Markdown 语法！你可以自由使用粗体、斜体、无序列表（-）、有序列表及表格来美化结构。
2. 符号与高亮徽章：
   - 请在回答中适当融入贴切的 Emoji 表情符号，让界面富有现代感。
   - 如果一次需要列出多个数据，可以适当采用可视化程度更高的表格形式。
3. 动态应答与上下文连贯性（极其重要）：
   - 请仔细关注历史对话上下文！如果主人当前的提问是对上一句对话的补充、修正或追问，请结合上下文给出智能应答，切勿答非所问或突然岔开话题。
   - 如果挂载了数据，请基于数据精准回答。
   - 如果只是打招呼、闲聊等无关话题，请以大管家的身份配合已有家庭数据进行有温度的互动。
4. 语言与排版规范：
   - 语言极致简洁，拒绝废话，直奔主题。分点换行，保持视窗美观。"""

    # 🚀 8. 组装 Message Payload (System Prompt + 历史多轮记忆 + 当前用户提问)
    messages_payload = [{"role": "system", "content": system_prompt}]
    messages_payload.extend(history_messages)
    messages_payload.append({"role": "user", "content": query})

    # 9. 发起最终模型请求
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages_payload,
            temperature=0.4  # 微调温度参数，确保上下文逻辑严谨集中
        )
        reply_content = response.choices[0].message.content

        # 10. 实时写入管家回复到数据库
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


# ================= 🚀 调试路由：一键触发早报测试 =================
@router.post("/api/debug/trigger_morning_report")
async def trigger_morning_report_debug(secret_key: str = ""):
    """手动一键触发每日早报（带暗号保护）"""
    if secret_key != "open666": 
        return {"status": "error", "message": "暗号错误，拒绝执行推送"}
        
    await run_daily_morning_job()
    return {"status": "success", "message": "企业微信早报已手动执行发送！"}