import os
from dotenv import load_dotenv

# 加载当前目录下的 .env 文件
load_dotenv()

API_KEY = os.getenv("FAMILYBOT_API_KEY")
BASE_URL = os.getenv("FAMILYBOT_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/")
MODEL_NAME = os.getenv("FAMILYBOT_MODEL_NAME", "glm-4-flash")
# Windows 本地开发建议直接在项目根目录下生成 db
DB_PATH = os.getenv("FAMILYBOT_DB_PATH", "medicine.db")