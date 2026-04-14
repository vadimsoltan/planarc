FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend
ENV FRONTEND_DIST_DIR=/app/frontend-dist

COPY backend/ /app/backend/

# Avoid an extra isolated build env during image builds; it is noticeably slower on small droplets.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --no-build-isolation .

COPY --from=frontend-builder /build/frontend/dist /app/frontend-dist

EXPOSE 8000

CMD ["/bin/sh", "start.sh"]
