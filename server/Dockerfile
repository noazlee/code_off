FROM python:3.11-slim
WORKDIR /app

# Install packages
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc g++ \
    docker
    
COPY requirements.txt app.py ./
RUN pip install -r requirements.txt

EXPOSE 5001
CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "5001"]