from fastapi import APIRouter, HTTPException
from typing import List
import sqlite3
from pydantic import BaseModel
from config import DB_PATH
from database import get_db_medicines

router = APIRouter(tags=["Medicine"])

class MedicineItem(BaseModel):
    name: str
    count: str = ""
    location: str = ""
    expire_date: str = ""
    usage: str = ""

@router.get("/api/medicines")
async def get_all_medicines():
    try:
        return {"status": "success", "data": [dict(row) for row in get_db_medicines()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/add_medicine")
async def add_medicine(name: str, count: str = "", location: str = "", expire_date: str = "", usage: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO medicines (name, count, location, expire_date, usage) VALUES (?, ?, ?, ?, ?)", 
                       (name, count, location, expire_date, usage))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "药品添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/update_medicine")
async def update_medicine(id: int, name: str, count: str = "", location: str = "", expire_date: str = "", usage: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE medicines SET name=?, count=?, location=?, expire_date=?, usage=? WHERE id=?", 
                       (name, count, location, expire_date, usage, id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "药品更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/delete_medicine")
async def delete_medicine(id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medicines WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "药品删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 批量导入路由
@router.post("/api/batch_add_medicine")
async def batch_add_medicine(items: List[MedicineItem]):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO medicines (name, count, location, expire_date, usage) VALUES (?, ?, ?, ?, ?)",
            [(item.name, item.count, item.location, item.expire_date, item.usage) for item in items]
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功批量导入 {len(items)} 条药品记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))