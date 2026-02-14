# BusyEdge - Crypto Trading Intelligence

## Overview
AI-powered crypto trading intelligence platform providing market data, whale tracking, sentiment analysis, and AI-generated trade signals.

## Brand
**Busy** - Umbrella brand (Google-style naming: Busy + Name)

## Features
1. **Market Dashboard** - Real-time prices, Fear & Greed Index, funding rates
2. **Whale Tracker** - Large transfers, exchange flows, wallet tracking
3. **Sentiment Scanner** - Twitter/Reddit NLP, news analysis
4. **AI Signals** - LLM-powered buy/sell recommendations
5. **Portfolio Tracker** - Position management, P&L
6. **Alerts System** - Price/mention notifications

## Tech Stack
- Frontend: Next.js 14 + TypeScript + TailwindCSS
- Backend: FastAPI (Python 3.11)
- Database: PostgreSQL + pgvector
- AI: OpenAI API, FinBERT

## Development Progress

### Phase 1: Core Infrastructure ✅ (Feb 14)
- [x] Next.js frontend setup
- [x] FastAPI backend setup  
- [x] Project structure created
- [x] Docker Compose setup

### Phase 2: Market Data ✅ (Complete)
- [x] All features complete

### Phase 3: Whale Tracking ✅ (Complete)
- [x] Whale tracking service (whale_tracking.py)
- [x] API endpoints
- [x] WhaleDashboard UI

### Phase 4: Sentiment Analysis ✅ (Complete)
- [x] Sentiment service (sentiment.py)
- [x] API endpoints
- [x] SentimentDashboard UI
- [x] Overall market sentiment
- [x] Coin-specific sentiment with selector
- [x] Trending topics

### Phase 5: AI Signals ✅ (Complete)
- [x] AI signals service (ai_signals.py)
- [x] Multi-agent architecture (market + sentiment + signal generator)
- [x] API endpoints (/ai/signals, /ai/signals/{coin}, /ai/analysis/{coin})
- [x] AISignalsDashboard UI
- [x] Signal cards with BUY/SELL/HOLD badges
- [x] Confidence scores
- [x] Detailed analysis modal

### Phase 6: Portfolio Tracker ✅ (Complete)
- [x] Portfolio service (portfolio.py) with mock positions
- [x] API endpoints (/portfolio, /portfolio/{coin})
- [x] PortfolioDashboard UI
- [x] Positions table and P&L summary

### Phase 7: Alerts ⏳
- [ ] Price alerts
- [ ] Telegram notifications

## Milestones
1. ✅ Repo created (Feb 14)
2. ✅ Phase 1: Core Infra (Feb 14)
3. ✅ Phase 2: Market Data
4. ✅ Phase 3: Whale Tracking
5. ✅ Phase 4: Sentiment
6. ✅ Phase 5: AI Signals
7. ✅ Phase 6: Portfolio Tracker
8. ⏳ Phase 7: Alerts
9. ⏳ Launch

---
Last Updated: 2026-02-14
