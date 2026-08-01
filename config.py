import os
from dotenv import load_dotenv

# 加载当前目录下的 .env 文件
load_dotenv()

API_KEY = os.getenv("FAMILYBOT_API_KEY")
BASE_URL = os.getenv("FAMILYBOT_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/")
MODEL_NAME = os.getenv("FAMILYBOT_MODEL_NAME", "glm-4-flash")
#图片识别模型
AGNES_API_KEY = os.getenv("AGNES_API_KEY", API_KEY)  # 如果没单独配，默认复用主 Key
AGNES_BASE_URL = os.getenv("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1")
# Windows 本地开发建议直接在项目根目录下生成 db
DB_PATH = os.getenv("FAMILYBOT_DB_PATH", "medicine.db")
#企业微信推送地址
WECHAT_WEBHOOK_URL = os.getenv("FAMILYBOT_WECHAT_WEBHOOK_URL", "xxxxxx")

# 读取早报时间字符串，如果没有配置，则默认 07:30
report_times_str = os.getenv("MORNING_REPORT_TIMES", "07:30")

# 将 "08:00,09:00,10:00" 解析为干净的列表 [['08', '00'], ['09', '00'], ['10', '00']]
MORNING_REPORT_TIMES = []
for t in report_times_str.split(","):
    t = t.strip()
    if ":" in t:
        hour, minute = t.split(":")
        MORNING_REPORT_TIMES.append((hour.zfill(2), minute.zfill(2)))