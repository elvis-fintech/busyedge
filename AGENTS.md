# Repository Guidelines

## Project Structure & Module Organization
BusyEdge is split into `frontend/` (Next.js 14 + TypeScript) and `backend/` (FastAPI). Frontend app routes live in `frontend/src/app/`, shared UI in `frontend/src/components/`, and client helpers in `frontend/src/lib/`. Backend API routers are in `backend/app/api/`, business services in `backend/app/services/`, and shared models in `backend/app/models/`. Root-level orchestration files include `docker-compose.yml`, `.env.example`, `README.md`, and `SPEC.md`.

## Build, Test, and Development Commands
- `cd frontend && npm install && npm run dev`: start frontend on `http://localhost:3000`.
- `cd frontend && npm run build`: production build check for Next.js.
- `cd frontend && npm run lint`: run ESLint via Next.js config.
- `cd backend && pip install -r requirements.txt && python main.py`: run FastAPI on `http://localhost:8000`.
- `docker-compose up --build`: run both services together in containers.

## Coding Style & Naming Conventions
Use TypeScript strict mode in frontend and keep components in PascalCase (e.g., `MarketDashboard.tsx`). Use camelCase for variables/functions and meaningful service names in backend (e.g., `market_data.py`, `whale_tracking.py`). Follow existing formatting: 2-space indentation in frontend files, 4-space indentation in Python. Keep API paths under `/api/...` and group logic by domain.

## Testing Guidelines
There is no committed automated test suite yet. For every feature or bug fix, include at least one reproducible verification path:
- Frontend: run `npm run lint` and manually verify affected dashboard tab(s).
- Backend: call changed endpoints via `http://localhost:8000/docs` and validate response shape/status.
When adding tests, place frontend tests near components and backend tests under `backend/tests/` using `pytest` naming (`test_<feature>.py`).

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style with optional scope, such as `feat(frontend): ...`, `feat(api): ...`, and `docs(spec): ...`. Keep commits focused to one concern. PRs should include:
- concise summary of behavior changes,
- linked issue/spec section,
- API examples or UI screenshots for changed flows,
- local checks run (`npm run lint`, backend smoke check, or `docker-compose up`).

## Security & Configuration Tips
Never commit secrets. Copy `.env.example` to `.env` for local configuration. Restrict CORS/API URLs to expected local hosts during development and review environment variables before deployment.
