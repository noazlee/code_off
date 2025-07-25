FROM python:3.13-slim
WORKDIR /app

COPY requirements.txt app.py ./
RUN pip install -r requirements.txt

EXPOSE 5001
CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "5001"]