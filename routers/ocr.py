from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import AsyncOpenAI
import base64
import os
from config import AGNES_API_KEY, AGNES_BASE_URL
router = APIRouter(tags=["Agnes OCR"])

# 实例化 Agnes 的客户端
client = AsyncOpenAI(
    api_key=AGNES_API_KEY,
    base_url=AGNES_BASE_URL
)

@router.post("/api/parse_instruction")
async def parse_instruction(file: UploadFile = File(...)):
    try:
        # 1. 读图并转成 Base64
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # 2. 构造 Vision 提示词
        prompt = """
        你是一个专业的家庭医疗助理。请仔细阅读这张药品说明书图片，准确提取出以下信息：
        1. 【用法用量】：必须包含详细的成人/儿童/按体重换算的剂量表。
        2. 【注意事项与禁忌】：提取关键的禁忌人群及不良反应。

        要求：
        - 语言简洁清晰，直奔主题。
        - 严禁使用 ** 加粗符号。
        - 格式按点空行分段，方便手机端查看。
        """

        # 3. 发送给 Agnes 2.5 Flash
        response = await client.chat.completions.create(
            model="agnes-2.5-flash",  # 或 agnes-2.0-flash
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            temperature=0.1
        )

        result_text = response.choices[0].message.content
        return {"status": "success", "text": result_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agnes 识别失败: {str(e)}")