"""Market Data API 路由。"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Query

from app.services.funding import funding_rate_service
from app.services.market_data import coin_gecko_service
from app.services.fear_greed import fear_greed_service

router = APIRouter(prefix="/market", tags=["market"])


def _parse_csv_param(value: str | None) -> list[str] | None:
    if not value:
        return None
    parsed = [item.strip() for item in value.split(",") if item.strip()]
    return parsed or None


@router.get("/prices")
async def get_market_prices(
    coin_ids: str | None = Query(
        default=None, description="Coin IDs，逗號分隔，例如 bitcoin,ethereum,solana"
    )
):
    parsed_coin_ids = _parse_csv_param(coin_ids)
    prices = await coin_gecko_service.get_simple_prices(parsed_coin_ids)
    return {"data": prices}


@router.get("/overview")
async def get_market_overview():
    overview = await coin_gecko_service.get_market_overview()
    return {"data": overview}


@router.get("/funding")
async def get_funding_rates(
    symbols: str | None = Query(default=None, description="交易對，逗號分隔，例如 BTCUSDT,ETHUSDT")
):
    parsed_symbols = _parse_csv_param(symbols)
    funding = await funding_rate_service.get_merged_funding_rates(parsed_symbols)
    return {"data": funding}


@router.get("/dashboard")
async def get_dashboard_data(
    coin_ids: str | None = Query(default=None, description="Coin IDs，逗號分隔"),
    symbols: str | None = Query(default=None, description="交易對，逗號分隔"),
):
    parsed_coin_ids = _parse_csv_param(coin_ids)
    parsed_symbols = _parse_csv_param(symbols)

    prices_task = coin_gecko_service.get_simple_prices(parsed_coin_ids)
    overview_task = coin_gecko_service.get_market_overview()
    funding_task = funding_rate_service.get_merged_funding_rates(parsed_symbols)

    prices, overview, funding = await asyncio.gather(
        prices_task, overview_task, funding_task
    )

    return {
        "data": {
            "generated_at": datetime.now(UTC).isoformat(),
            "prices": prices,
            "overview": overview,
            "funding": funding,
        }
    }


@router.get("/fear-greed")
async def get_fear_greed_current():
    """取得最新 Fear & Greed Index。"""
    data = await fear_greed_service.get_current()
    return {"data": data}


@router.get("/fear-greed/history")
async def get_fear_greed_history(
    days: int = Query(default=30, ge=1, le=100, description="歷史天數")
):
    """取得 Fear & Greed 歷史數據。"""
    history = await fear_greed_service.get_history(days)
    return {"data": history}

