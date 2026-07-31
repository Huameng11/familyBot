from fastapi import APIRouter, HTTPException
from typing import List
import sqlite3
from pydantic import BaseModel
from config import DB_PATH
from database import get_db_storage

router = APIRouter(tags=["Storage"])

class StorageItem(BaseModel):
    item_name: str
    category: str = ""
    quantity: str = ""
    location: str = ""
    remark: str = ""

@router.get("/api/storage")
async def get_all_storage():
    try:
        return {"status": "success", "data": [dict(row) for row in get_db_storage()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/add_storage")
async def add_storage(item_name: str, category: str = "", quantity: str = "", location: str = "", remark: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO storage (item_name, category, quantity, location, remark) VALUES (?, ?, ?, ?, ?)", 
                       (item_name, category, quantity, location, remark))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "物资添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/update_storage")
async def update_storage(id: int, item_name: str, category: str = "", quantity: str = "", location: str = "", remark: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE storage SET item_name=?, category=?, quantity=?, location=?, remark=? WHERE id=?", 
                       (item_name, category, quantity, location, remark, id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "物资更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/delete_storage")
async def delete_storage(id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM storage WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "物资删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 批量导入路由
@router.post("/api/batch_add_storage")
async def batch_add_storage(items: List[StorageItem]):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO storage (item_name, category, quantity, location, remark) VALUES (?, ?, ?, ?, ?)",
            [(item.item_name, item.category, item.quantity, item.location, item.remark) for item in items]
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功批量导入 {len(items)} 条物资记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))