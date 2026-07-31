from fastapi import APIRouter, HTTPException
import sqlite3
from config import DB_PATH
from database import get_db_calendars

router = APIRouter(tags=["Calendar"])

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