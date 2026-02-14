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

```bash
docker-compose up --build
```

## Development

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
