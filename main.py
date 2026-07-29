import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from openai import OpenAI

app = FastAPI(title="FamilyBot - 家庭管家")

# ------------------------------------------------------------------
# 🔑 大模型配置（这里以智谱/DeepSeek/阿里等兼容 API 为例）
# 请替换为你自己的 API_KEY 以及相应的 BASE_URL
# ------------------------------------------------------------------
API_KEY = "e30bb3faddb14f0390880adf14828947.gH30hLAIljaXpDOJ"  # 👈 填入你的 API Key
BASE_URL = "https://open.bigmodel.cn/api/paas/v4"  # 智谱示例；若用 DeepSeek 改为 https://api.deepseek.com
MODEL_NAME = "GLM-4.7-Flash"  # 智谱免费/低成本模型；若用 DeepSeek 改为 deepseek-chat

# 初始化客户端
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

# 模拟的本地药品数据库（下一阶段会改成真正的 SQLite 数据库）
MOCK_MEDICINE_DB = [
    {"name": "布洛芬缓释胶囊", "eff": "解热镇痛，用于感冒发热、头痛、关节痛", "expiry": "2027-12", "stock": 2},
    {"name": "对乙酰氨基酚片", "eff": "普通感冒或流感引起的发热，也用于缓解轻至中度疼痛", "expiry": "2026-05", "stock": 1},
    {"name": "蒙脱石散", "eff": "成人及儿童急、慢性腹泻", "expiry": "2028-01", "stock": 3},
    {"name": "铝碳酸镁片", "eff": "急慢性胃炎、胃痛、胃灼热感（反酸）、饱胀", "expiry": "2027-08", "stock": 1}
]

# 根目录自动重定向到前端 PWA 页面
@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/index.html")
async def read_index_html():
    return RedirectResponse(url="/static/index.html")

# 🤖 核心：AI 聊天/药品检索分析接口
@app.get("/api/chat")
async def chat_with_bot(query: str):
    # 1. 将本地药品列表格式化为文本
    med_list_str = ""
    for idx, item in enumerate(MOCK_MEDICINE_DB, 1):
        med_list_str += f"{idx}. {item['name']} | 功效: {item['eff']} | 有效期: {item['expiry']} | 库存: {item['stock']}盒\n"

    # 2. 构建 System Prompt（让大模型充当家庭药箱管家）
    system_prompt = f"""你是一个贴心的家庭健康与药箱管家。
以下是用户家庭药箱中【当前现有的药品清单】：
---
{med_list_str}
---
请根据用户的提问，结合上述药箱清单给出合理的解答：
1. 如果用户询问症状，优先检查药箱内是否有匹配且未过期的药物，并给出科学用药建议。
2. 强调“用药请遵医嘱或仔细阅读说明书”，对于严重不适明确建议就医。
3. 如果家里没有对应的药，请明确告知家里没药，并建议购买什么类型的药。
回答请保持温和、专业、简洁。"""

    try:
        # 3. 请求大模型 API
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.7
        )
        reply_content = response.choices[0].message.content
        return {"reply": reply_content}

    except Exception as e:
        print(f"调用 API 出错: {e}")
        return {"reply": f"抱歉，小管家思考时出错了（请检查 API Key 或网络环境）：{str(e)}"}

# 挂载静态文件夹
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)