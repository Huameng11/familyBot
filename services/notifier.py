import os
import re
import sqlite3
import datetime
import httpx
from openai import AsyncOpenAI
from config import API_KEY, BASE_URL, MODEL_NAME, DB_PATH, WECHAT_WEBHOOK_URL

client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=30.0)

# 🚀 精准判断药品存量是否严格为 0 / 已耗尽（加入防 Null/None 安全保护）
def is_zero_stock(count_val) -> bool:
    if count_val is None:
        return False
    count_str = str(count_val).strip()
    # 匹配显式的用完关键词
    if count_str in ['0', '用完', '已用完', '无', '缺货', '耗尽', '0盒', '0片', '0袋', '0瓶', '0支']:
        return True
    # 正则匹配以 0 开头的数量说明（如 0盒, 0片, 0.0）
    if re.match(r'^0(\.0+)?[\u4e00-\u9fa5a-zA-Z]*$', count_str):
        return True
    return False

# 1. 巡检数据库，提取今天需要关心的核心动态
def inspect_family_data():
    from database import get_db_medicines, get_db_storage, get_db_calendars, get_db_memos
    
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    
    # A. 检查今天是否有生日/日程行程
    calendars = get_db_calendars()
    today_events = [f"【{c['title']}】({c['remind_time'] or '全天'})" for c in calendars if str(c['event_date']) == today_str]
    
    # B. 检查药品：包含已过期、即将过期，以及严格存量为0/消耗完的药品
    medicines = get_db_medicines()
    expiring_meds = []
    zero_stock_meds = []
    
    for row in medicines:
        # 🚀 安全防御：不管从数据库捞出来的是 Row、Tuple 还是 Dict，统一强转标准 Dict 处理
        m = dict(row)
        
        name = m.get('name', '未命名药品')
        count = m.get('count', '')
        expire_date = m.get('expire_date', '')

        # 1. 检查存量是否严格为 0
        if is_zero_stock(count):
            zero_stock_meds.append(f"• `{name}` (<font color=\"warning\">⚠️存量为0/已用完</font>)")
            
        # 2. 检查有效期
        if expire_date:
            try:
                exp_date = datetime.datetime.strptime(str(expire_date).replace('/', '-'), "%Y-%m-%d").date()
                days_left = (exp_date - datetime.date.today()).days
                if days_left <= 0:
                    expiring_meds.append(f"• `{name}` (<font color=\"warning\">❌已过期</font>)")
                elif days_left <= 30:
                    expiring_meds.append(f"• `{name}` (⚠️剩{days_left}天过期)")
            except Exception:
                pass

    # C. 检查数量偏低或标注缺货的物资
    storage = get_db_storage()
    low_stock = []
    for row in storage:
        s = dict(row)
        item_name = s.get('item_name', '未知物资')
        q = str(s.get('quantity', ''))
        if any(k in q for k in ['0', '1', '缺', '少', '用完', '需补']):
            low_stock.append(f"• `{item_name}` (当前余量: <font color=\"comment\">{q}</font>)")

    # D. 提取最新的 3 条备忘录提醒
    memos = get_db_memos()
    recent_memos = []
    for row in memos[:3]:
        mem = dict(row)
        recent_memos.append(f"• {mem.get('title', '无标题备忘')}")

    # 结构化汇总
    raw_info = []
    if today_events: 
        raw_info.append(f"📅 今日日程/纪念日:\n" + "\n".join([f"• {e}" for e in today_events]))
    
    med_alerts = zero_stock_meds + expiring_meds
    if med_alerts: 
        raw_info.append(f"💊 药物预警与缺药提醒:\n" + "\n".join(med_alerts))
    
    if low_stock: 
        raw_info.append(f"📦 物资缺货补给提示:\n" + "\n".join(low_stock))
    if recent_memos: 
        raw_info.append(f"📝 重点备忘提示:\n" + "\n".join(recent_memos))

    return "\n\n".join(raw_info) if raw_info else "今日家庭各项数据库运行一切正常，暂无特殊紧急预警。"


# 2. 调用大模型生成早报
async def generate_morning_report(raw_data_str: str) -> str:
    system_prompt = """你是一位贴心、优雅、富有责任感的智能家庭大管家（FamilyBot）。
请根据系统为你提取的今日家庭巡检原始数据，为主人撰写一份简短、温馨的“每日早报”。

【企业微信排版技术规范】：
1. 必须使用标准 Markdown。请多分段，善用无序列表符号（•）。
2. 可以使用行内代码块（`药品`）高亮名称。
3. 可选标签：<font color="info">绿色</font>、<font color="warning">红色</font>。

【撰写规则】：
1. 字数控制在 150~250 字左右，分段清晰，多用贴切的 Emoji 表情（☀️, ☕, 💊, 📅）。
2. 如果有存量为0的药品或已过期药品，请清晰提醒主人及时采购补充。
3. 结尾附带一句暖心的晨间问候。"""

    user_prompt = f"这是今天的家庭巡检原始数据：\n{raw_data_str}\n\n请为主人生成今天的每日早报："

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"☀️ 主人早安！今天是我为您守候的又一天。\n\n【今日提醒】\n{raw_data_str}\n\n祝您今天工作顺利！"


# 3. 针对小爱同学/语音播报的文本清洗并写入 data/msg.txt 函数
def save_clean_msg_for_tts(text: str):
    cleaned = re.sub(r'^.*?(早上好|早安|每日早报|早报|为您带来|为您生成).*?[：:\n\s]*', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'<font color=.*?>', '', cleaned)
    cleaned = re.sub(r'</font>', '', cleaned)
    cleaned = cleaned.replace('**', '').replace('`', '').replace('#', '')
    cleaned = cleaned.replace('•', '').replace('-', '').replace('*', '')
    cleaned = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27ff]', '', cleaned)
    cleaned = cleaned.replace(':\n', '，').replace('：\n', '，')
    cleaned = cleaned.replace('\n\n', '。').replace('\n', '。')
    cleaned = re.sub(r'。[。,\s]*', '。', cleaned)
    
    cleaned_text = cleaned.strip()
    os.makedirs("data", exist_ok=True)
    msg_path = os.path.join("data", "msg.txt")
    
    try:
        with open(msg_path, "w", encoding="utf-8") as f:
            f.write(cleaned_text)
        print(f"✅ 小爱语音专用文本已清理并保存至: {msg_path}")
    except Exception as e:
        print(f"❌ 写入 msg.txt 失败: {str(e)}")


# 4. 发送数据到企业微信 Webhook 机器人
async def push_to_wechat_webhook(markdown_content: str):
    if not WECHAT_WEBHOOK_URL or "webhook/send?key=" not in WECHAT_WEBHOOK_URL:
        print("⚠️ 未配置有效的 WECHAT_WEBHOOK_URL，跳过企业微信推送。")
        return

    payload = {
        "msgtype": "markdown",
        "markdown": { "content": markdown_content }
    }
    
    async with httpx.AsyncClient() as async_client:
        try:
            res = await async_client.post(WECHAT_WEBHOOK_URL, json=payload, timeout=10.0)
            result = res.json()
            if result.get("errcode") == 0:
                print("✅ 企业微信群机器人早报推送成功！")
            else:
                print(f"❌ 企业微信推送失败: {result.get('errmsg')}")
        except Exception as e:
            print(f"❌ 企业微信推送网络异常: {str(e)}")


# 5. 写入 SQLite 历史记录（网页端显示）
def inject_to_web_chat(report_text: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chat_history (role, text) VALUES (?, ?)", ("bot", report_text))
        conn.commit()
        conn.close()
        print("✅ 每日早报已同步更新至网页端聊天框历史中。")
    except Exception as e:
        print(f"❌ 存入聊天历史失败: {str(e)}")


# 6. 🚀 强力升级：调度任务总执行入口（加入全局捕获，杜绝 500 盲区）
async def run_daily_morning_job():
    print("⏰ [定时任务启动] 开始巡检家庭数据库并生成早报...")
    try:
        # 1. 巡检提取原始数据
        raw_data = inspect_family_data()
        
        # 2. LLM 智能润色
        report_md = await generate_morning_report(raw_data)
        
        # 3. 渠道 A：企业微信机器人群通知
        await push_to_wechat_webhook(report_md)
        
        # 4. 渠道 B：同步网页端对话挂载
        inject_to_web_chat(report_md)
        
        # 5. 渠道 C：清洗文本并保存到 data/msg.txt
        save_clean_msg_for_tts(report_md)
        
        print("🎉 [定时任务结束] 早报全渠道下发完毕！")
    except Exception as e:
        # 🚀 抓取核心崩溃堆栈并在终端打印，方便直接针对行数破案
        import traceback
        print("❌ [Fatal Error] 定时任务彻底崩溃！错误日志如下：")
        traceback.print_exc()
        # 向上抛出以通知 API 层
        raise RuntimeError(f"服务内部逻辑报错，明细: {str(e)}")