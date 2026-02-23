# ProLog v3.0 — Deployment Guide

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (built into Nginx image) |
| Backend | Python 3.12 + FastAPI + asyncpg |
| Database | PostgreSQL 16 |
| Proxy | Nginx (SSL termination, SPA routing, API proxy) |
| Packaging | Docker Compose |

## Local Development

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Requires a running Postgres — either local or via docker-compose up db
DATABASE_URL=postgresql+asyncpg://prolog:prolog@localhost:5432/prolog \
JWT_SECRET=dev-secret-not-for-production \
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # proxies /api to localhost:8000
```

## Production Deployment (bltbox)

### 1. Clone and configure
```bash
git clone <repo> /opt/prolog
cd /opt/prolog
cp .env.example .env
```

Edit `.env`:
```
DB_PASSWORD=<strong random password>
JWT_SECRET=<output of: python3 -c "import secrets; print(secrets.token_hex(64))">
CLAUDE_API_KEY=sk-ant-...   # optional, enables AI analysis
FRONTEND_ORIGIN=https://prolog.bltbox.com
NODE_ENV=production
```

### 2. SSL certificates

Place your certificates in `nginx/ssl/`:
- `nginx/ssl/fullchain.pem`
- `nginx/ssl/privkey.pem`

Using Let's Encrypt (certbot):
```bash
certbot certonly --standalone -d prolog.bltbox.com
cp /etc/letsencrypt/live/prolog.bltbox.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/prolog.bltbox.com/privkey.pem nginx/ssl/
```

### 3. Start

```bash
docker-compose up -d --build
```

### 4. Verify

```bash
curl https://prolog.bltbox.com/api/health
# → {"status":"ok","env":"production"}
```

## Updating

```bash
git pull
docker-compose up -d --build
```

## Backup

```bash
docker-compose exec db pg_dump -U prolog prolog > backup_$(date +%Y%m%d).sql
```
