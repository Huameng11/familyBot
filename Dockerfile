# 使用官方通用的轻量级 Python 镜像
FROM python:3.11-slim

# 🚀 核心修复：在构建阶段安装时区数据并设定为上海时区
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata && \
    ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装依赖（包括刚刚装的 python-multipart）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]