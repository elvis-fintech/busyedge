# BusyEdge

BusyEdge 係一個加密市場監控平台，提供市場總覽、巨鯨追蹤、情緒分析、AI 訊號、投資組合同價格提醒。

## 功能重點

- **真實資料來源**：CoinGecko、Alternative.me、Blockchair、交易所 funding API。
- **降級策略**：上游失敗時優先回快取資料（`is_stale=true`），唔會 fabricate 假數值。
- **多語言與主題**：支援繁中/英文切換、Light/Dark mode。

## 專案結構

```text
busyedge/
├─ frontend/                  # Next.js 14 + Tailwind
│  └─ src/components/         # 各 dashboard UI
├─ backend/                   # FastAPI
│  └─ app/services/           # 市場、情緒、AI、巨鯨等服務
├─ docker-compose.yml
└─ .env.example
```

## 本機開發

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

## Docker 啟動

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Swagger: `http://localhost:8000/docs`

## 必要/建議環境變數

- `NEXT_PUBLIC_API_BASE_URL`：例如 `http://localhost:8000/api`
- `PORTFOLIO_POSITIONS_JSON`（建議）：

```json
[{"symbol":"BTC","quantity":0.5,"avg_cost_usd":52000},{"symbol":"ETH","quantity":3,"avg_cost_usd":2100}]
```

> 未設定 `PORTFOLIO_POSITIONS_JSON` 時，Portfolio API 會回 `503`（刻意避免假資料）。

- Telegram 提醒（可選）：
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

## 驗證指令

```bash
# 前端
cd frontend
npm run lint
npm run build

# 後端
cd ../backend
python -m compileall .
```
