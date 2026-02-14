# BusyEdge

Edge Computing Platform

## Project Structure

```
busyedge/
├── frontend/           # Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/ # React components
│   │   └── lib/       # Utilities
│   ├── package.json
│   └── tailwind.config.js
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── models/    # Pydantic models
│   │   └── services/  # Business logic
│   ├── requirements.txt
│   └── main.py
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Docker

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

#### Docker 常用指令

```powershell
# 查看服務狀態
docker compose ps

# 查看即時日誌
docker compose logs -f backend
docker compose logs -f frontend

# 停止與移除容器
docker compose down
```

#### Docker 疑難排解

- 如果出現 `bind: ... 0.0.0.0:3000`，表示本機 3000 端口被佔用。
- 可改 `docker-compose.yml` 的 frontend ports：
  - 由 `"3000:3000"` 改為 `"3001:3000"`，然後用 `http://localhost:3001` 存取前端。

## Development

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Notes

- Frontend API base URL: `NEXT_PUBLIC_API_BASE_URL` (example: `http://localhost:8000/api`)
- Optional Telegram alerts:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

## Docker Files

- `frontend/Dockerfile`: Next.js 生產版 build + start。
- `frontend/.dockerignore`: 排除 `node_modules`、`.next`。
- `backend/Dockerfile`: FastAPI + Uvicorn 服務。
- `backend/.dockerignore`: 排除 Python cache 與虛擬環境。
