from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from database import init_db
from routers import chat, medicine, storage, memo # 导入 memo

app = FastAPI(title="FamilyBot - 家庭管家核心引擎")

# 自动运行数据库初始化
init_db()

# 注册各个解耦后的模块
app.include_router(chat.router)
app.include_router(medicine.router)
app.include_router(storage.router)
app.include_router(memo.router) # 包含备忘录路由

@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/index.html")
async def read_index_html():
    return RedirectResponse(url="/static/index.html")

app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)