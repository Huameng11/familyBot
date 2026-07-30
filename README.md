familyBot - 全家桶智能家庭助手
familyBot 是一款专为家庭日常管理打造的轻量级、响应式智能助手系统。项目采用前后端分离设计，后端基于高性能的 FastAPI 框架，前端采用原生 JavaScript 构建并支持 PWA（渐进式 Web 应用）特性，方便在手机、平板或 PC 端无缝安装与使用。

✨ 功能特性
项目目前涵盖了五个核心家庭应用场景：

🤖 AI 智能聊天 (routers/chat)

对接大语言模型（如 OpenAI 兼容接口），提供日常对话、育儿咨询、食谱推荐等智能家庭支持。

💊 用药管理 (routers/medicine)

记录家庭成员的药品库存、每日用药剂量与服用频次，防止漏服与误服。

📝 备忘录便签 (routers/memo)

随时随地记录家庭琐事、购物清单、待办事项，支持实时保存与归档。

📦 物品收纳管理 (routers/storage)

数字化管理家中的储物空间，通过分类与标签快查物品存放位置，告别“东西找不到”的烦恼。

🔍 OCR 文字识别 (routers/ocr)

拍照或上传说明书、药单、发票收据，一键提取文字，便于快速录入系统。

🛠️ 技术栈
后端：

Python 3.10+

FastAPI：异步、高性能的 Web API 框架

Uvicorn：ASGI 服务器驱动

Pydantic v2：严格的数据数据校验与类型提示

SQLite / SQLAlchemy：轻量级本地数据持久化

OpenAI SDK / Python-dotenv：大模型接入与环境变量管理

前端：

原生 HTML5 / CSS3 / JavaScript (ES6+)

PWA 支持：配置有 manifest.json 与 sw.js（Service Worker），支持离线缓存及手机端独立应用化安装。

📂 项目结构
Plaintext
familyBot/
├── .venv/                  # Python 虚拟环境
├── routers/                # 路由业务逻辑模块
│   ├── chat.py             # AI 智能聊天接口
│   ├── medicine.py         # 用药管理接口
│   ├── memo.py             # 备忘录接口
│   ├── ocr.py              # OCR 文字识别接口
│   └── storage.py          # 物品收纳接口
├── static/                 # 前端静态资源
│   ├── components/         # 前端模块化组件 (ChatTab, MedicineTab 等)
│   ├── css/                # 样式表 (style.css)
│   ├── index.html          # PWA 主单页入口
│   ├── manifest.json       # PWA 配置文件
│   └── sw.js               # Service Worker 脚本
├── config.py               # 环境变量与配置中心
├── database.py             # 数据库连接与初始化
├── main.py                 # FastAPI 程序主入口
├── requirements.txt        # 项目依赖清单
└── .env                    # 本地环境变量（需手动创建）
🚀 快速开始
1. 克隆与环境准备
确保您的系统中已安装 Python 3.10 或更高版本。

Bash
# 进入项目根目录
cd familyBot

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境 (Windows)
.venv\Scripts\activate
# 激活虚拟环境 (Linux/macOS)
source .venv/bin/activate

# 安装项目依赖
pip install -r requirements.txt
2. 配置环境变量
在项目根目录下创建一个名为 .env 的文件，并参考以下内容填写您的配置：

代码段
# 示例配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
DATABASE_URL=sqlite:///./familybot.db
3. 运行服务
通过 Uvicorn 启动后端服务（会自动托管 static 目录下的前端页面）：

Bash
python main.py
或者直接使用 uvicorn 命令：

Bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
启动成功后，在浏览器中访问：http://localhost:8000 即可进入家庭助手主页。

📱 PWA 安装说明
确保使用支持 PWA 的浏览器（如 Chrome, Edge, Safari）通过 HTTPS（或本地 localhost）访问本系统。

浏览器地址栏或菜单中会出现“安装”或“添加到主屏幕”的图标。

点击安装后，familyBot 将作为一个独立的 App 出现在您的桌面或手机桌面上，拥有独立的窗口体验，去除了浏览器地址栏，带来更原生、更纯净的使用体验。
