# 使用官方通用的轻量级 Python 镜像
FROM python:3.11-slim

WORKDIR /app

# 安装依赖（包括刚刚装的 python-multipart）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]