FROM python:3.13-slim
WORKDIR /app

COPY requirements.txt app.py ./
RUN pip install -r requirements.txt

EXPOSE 5000
CMD ["flask", "--app", "app", "run", "--host", "0.0.0.0"]