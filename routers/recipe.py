from fastapi import APIRouter, HTTPException
from typing import List
import sqlite3
from pydantic import BaseModel
from config import DB_PATH
from database import get_db_recipes

router = APIRouter(tags=["Recipe"])

class RecipeItem(BaseModel):
    name: str
    category: str = ""
    ingredients: str = ""
    difficulty: str = ""
    steps: str = ""
    tutorial_link: str = ""

@router.get("/api/recipes")
async def get_all_recipes():
    try:
        return {"status": "success", "data": [dict(row) for row in get_db_recipes()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/add_recipe")
async def add_recipe(name: str, category: str = "", ingredients: str = "", difficulty: str = "", steps: str = "", tutorial_link: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO recipes (name, category, ingredients, difficulty, steps, tutorial_link) VALUES (?, ?, ?, ?, ?, ?)", 
                       (name, category, ingredients, difficulty, steps, tutorial_link))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "菜谱添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/update_recipe")
async def update_recipe(id: int, name: str, category: str = "", ingredients: str = "", difficulty: str = "", steps: str = "", tutorial_link: str = ""):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE recipes SET name=?, category=?, ingredients=?, difficulty=?, steps=?, tutorial_link=? WHERE id=?", 
                       (name, category, ingredients, difficulty, steps, tutorial_link, id))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "菜谱更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/delete_recipe")
async def delete_recipe(id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM recipes WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "菜谱删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 批量导入路由
@router.post("/api/batch_add_recipe")
async def batch_add_recipe(items: List[RecipeItem]):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO recipes (name, category, ingredients, difficulty, steps, tutorial_link) VALUES (?, ?, ?, ?, ?, ?)",
            [(item.name, item.category, item.ingredients, item.difficulty, item.steps, item.tutorial_link) for item in items]
        )
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"成功批量导入 {len(items)} 条菜谱记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))