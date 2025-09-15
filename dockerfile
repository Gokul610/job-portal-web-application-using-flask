FROM python:3.13-slim
WORKDIR /app
COPY . /app
COPY requirements.txt .
RUN pip install -r requirements.txt
ENV PYTHONPATH=/app
EXPOSE 5000

CMD ["python","-m", "run.py"]