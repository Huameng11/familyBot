from fastapi import APIRouter, HTTPException
from typing import List
import sqlite3
from pydantic import BaseModel
from config import DB_PATH
from database import get_db_calendars

router = APIRouter(tags=["Calendar"])

class CalendarItem(BaseModel):
    title: str
    event_date: str
    category: str = ""
    location: str = ""
    remind_time: str = ""
    remark: str = ""

@router.get("/api/calendars")
async def get_all_calendars():
    try:
        return {"status": "success", "data": [dict(row) for row in get_db_calendars()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/add_calendar")
async def add_calendar(title: str, event_date: str, category: str = "", location: str = "", remind_time: str = "", remark: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO calendars (title, event_date, category, location, remind_time, remark) VALUES (?, ?, ?, ?, ?, ?)", 
                       (title, event_date, category, location, remind_time, remark))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "日历日程添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/update_calendar")
async def update_calendar(id: int, title: str, event_date: str, category: str = "", location: str = "", remind_time: str = "", remark: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE calendars SET title=?, event_date=?, category=?, location=?, remind_time=?, remark=? WHERE id=?", 
                       (title, event_date, category, location, remind_time, remark, id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "日历日程更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/delete_calendar")
async def delete_calendar(id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM calendars WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "日历日程删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 批量导入路由
@router.post("/api/batch_add_calendar")
async def batch_add_calendar(items: List[CalendarItem]):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO calendars (title, event_date, category, location, remind_time, remark) VALUES (?, ?, ?, ?, ?, ?)",
            [(item.title, item.event_date, item.category, item.location, item.remind_time, item.remark) for item in items]
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功批量导入 {len(items)} 条日历记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))