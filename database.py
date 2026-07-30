import sqlite3
from config import DB_PATH

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # 聊天历史记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 1. 创建药品表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, 
            count TEXT, 
            location TEXT,
            expire_date TEXT, 
            usage TEXT DEFAULT '', 
            eff TEXT DEFAULT ''
        )
    ''')
    
    # 2. 创建仓库表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS storage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL, 
            category TEXT DEFAULT '',
            quantity TEXT DEFAULT '', 
            location TEXT DEFAULT '', 
            remark TEXT DEFAULT ''
        )
    ''')
    # 3. 新增：家庭备忘录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
# 获取历史聊天记录（按时间正序排列，保证聊天流逻辑正确）
def get_db_chat_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT role, text FROM chat_history ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows
def get_db_medicines():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medicines ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_db_storage():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM storage ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows
# 新增：获取所有备忘录记录
def get_db_memos():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM memos ORDER BY id DESC") # 按时间倒序，最新的在上面
    rows = cursor.fetchall()
    conn.close()
    return rows