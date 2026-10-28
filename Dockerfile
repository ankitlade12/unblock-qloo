FROM node:22-bookworm-slim AS web
WORKDIR /build
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

FROM python:3.14-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home unblock
COPY services ./services
COPY --from=web /build/dist ./apps/web/dist
RUN mkdir -p /app/data && chown -R unblock:unblock /app/data
USER unblock
ENV DATABASE_PATH=/app/data/unblock.db PORT=8011 COOKIE_SECURE=true
EXPOSE 8011
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8011')+'/api/health',timeout=3)"
CMD ["sh", "-c", "exec uvicorn services.api.main:app --host 0.0.0.0 --port ${PORT:-8011}"]
