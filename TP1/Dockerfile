FROM python:3.9-slim
WORKDIR /app
COPY server.py .
RUN pip install --no-cache-dir flask
EXPOSE 9000
CMD ["python", "server.py"]
