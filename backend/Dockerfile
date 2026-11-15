FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Django admin static files are prepared at build time (no database needed).
RUN DJANGO_DEBUG=True python manage.py collectstatic --noinput
EXPOSE 8000
# Local Docker Compose overrides this CMD with Django's development server.
CMD ["sh", "start.sh"]
