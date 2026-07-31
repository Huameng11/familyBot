from fastapi import APIRouter, HTTPException
from typing import List
import sqlite3
from pydantic import BaseModel
from config import DB_PATH
from database import get_db_memos

router = APIRouter(tags=["Memo"])

class MemoItem(BaseModel):
    title: str
    content: str = ""

@router.get("/api/memos")
async def get_all_memos():
    try:
        return {"status": "success", "data": [dict(row) for row in get_db_memos()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/add_memo")
async def add_memo(title: str, content: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO memos (title, content) VALUES (?, ?)", (title, content))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "备忘添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/update_memo")
async def update_memo(id: int, title: str, content: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE memos SET title=?, content=? WHERE id=?", (title, content, id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "备忘更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/delete_memo")
async def delete_memo(id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memos WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "备忘删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 批量导入路由
@router.post("/api/batch_add_memo")
async def batch_add_memo(items: List[MemoItem]):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO memos (title, content) VALUES (?, ?)",
            [(item.title, item.content) for item in items]
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功批量导入 {len(items)} 条备忘记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))