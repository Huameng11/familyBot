from fastapi import APIRouter, HTTPException
import sqlite3
from config import DB_PATH
from database import get_db_memos

router = APIRouter(tags=["Memo"])

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
        return {"status": "success", "message": "备忘录添加成功"}
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
        return {"status": "success", "message": "备忘录更新成功"}
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
        return {"status": "success", "message": "备忘录删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))