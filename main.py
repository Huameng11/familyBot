from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# 🚀 1. 导入底层依赖、初始化函数与定时早报核心服务
from database import init_db
from routers import chat, medicine, storage, memo, ocr, calendar, recipe
from services.notifier import run_daily_morning_job

# 🚀 2. 实例化异步定时任务调度器
scheduler = AsyncIOScheduler()

# 🚀 3. 定义现代化 Lifespan 生命周期管理（无缝嵌入定时器）
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ------------------ 【服务启动阶段】 ------------------
    # 自动运行数据库初始化 (保留你原本的逻辑)
    init_db()
    
    # 注册定时任务：每天早上 07:30 准时巡检并发送企业微信群早报
    scheduler.add_job(
        run_daily_morning_job, 
        'cron', 
        hour=7, 
        minute=30, 
        id='daily_morning_job',
        replace_existing=True
    )
    
    # 启动调度引擎
    scheduler.start()
    print("🚀 [System] APScheduler 定时巡检引擎启动成功！(每天 07:30 自动分发早报)")
    
    yield  # 🟢 系统保持挂起，正常处理局域网请求...
    
    # ------------------ 【服务关闭阶段】 ------------------
    scheduler.shutdown()
    print("👋 [System] APScheduler 定时调度器已安全关闭。")


# 🚀 4. 初始化核心 FastAPI 实例（绑定生命周期）
app = FastAPI(title="FamilyBot - 家庭管家核心引擎", lifespan=lifespan)

# 🚀 5. 注册各个解耦后的模块路由 (完全保留你原本的顺序)
app.include_router(chat.router)
app.include_router(medicine.router)
app.include_router(storage.router)
app.include_router(memo.router)
app.include_router(ocr.router)
app.include_router(calendar.router)
app.include_router(recipe.router)

# 🚀 6. 核心修复：完全保留你原版手机秒开的重定向路由逻辑
@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/index.html")
async def read_index_html():
    return RedirectResponse(url="/static/index.html")

# 🚀 7. 静态文件挂载
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    # 修复了 reload 解析 Bug ("main:app")，彻底免疫手机 PWA 缓存死锁
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)