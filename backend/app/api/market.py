"""Market Data API 路由。"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query

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
    try:
        prices = await coin_gecko_service.get_simple_prices(parsed_coin_ids)
        return {"data": prices, "is_stale": False, "data_source": "coingecko"}
    except HTTPException as exc:
        cached_prices = coin_gecko_service.get_cached_simple_prices(parsed_coin_ids)
        if cached_prices is None:
            raise exc
        return {"data": cached_prices, "is_stale": True, "data_source": "coingecko_cache", "fallback_reason": exc.detail}


@router.get("/overview")
async def get_market_overview():
    try:
        overview = await coin_gecko_service.get_market_overview()
        return {"data": overview, "is_stale": False, "data_source": "coingecko"}
    except HTTPException as exc:
        cached_overview = coin_gecko_service.get_cached_market_overview()
        if cached_overview is None:
            raise exc
        return {"data": cached_overview, "is_stale": True, "data_source": "coingecko_cache", "fallback_reason": exc.detail}


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

    prices_result, overview_result, funding_result = await asyncio.gather(
        prices_task, overview_task, funding_task, return_exceptions=True
    )

    stale_reasons: list[str] = []
    is_stale = False

    if isinstance(prices_result, Exception):
        cached_prices = coin_gecko_service.get_cached_simple_prices(parsed_coin_ids)
        if cached_prices is None:
            raise HTTPException(status_code=502, detail="無法取得即時價格資料，且沒有可用快取") from prices_result
        prices = cached_prices
        stale_reasons.append("prices: coingecko_cache")
        is_stale = True
    else:
        prices = prices_result

    if isinstance(overview_result, Exception):
        cached_overview = coin_gecko_service.get_cached_market_overview()
        if cached_overview is None:
            raise HTTPException(status_code=502, detail="無法取得市場概覽資料，且沒有可用快取") from overview_result
        overview = cached_overview
        stale_reasons.append("overview: coingecko_cache")
        is_stale = True
    else:
        overview = overview_result

    if isinstance(funding_result, Exception):
        funding = []
        stale_reasons.append("funding: unavailable")
        is_stale = True
    else:
        funding = funding_result

    return {
        "data": {
            "generated_at": datetime.now(UTC).isoformat(),
            "prices": prices,
            "overview": overview,
            "funding": funding,
            "is_stale": is_stale,
            "data_source": "live" if not is_stale else "partial_cache",
            "stale_reasons": stale_reasons,
        }
    }


@router.get("/fear-greed")
async def get_fear_greed_current():
    """取得最新 Fear & Greed Index。"""
    data = await fear_greed_service.get_current_safe()
    return {"data": data}


@router.get("/fear-greed/history")
async def get_fear_greed_history(
    days: int = Query(default=30, ge=1, le=100, description="歷史天數")
):
    """取得 Fear & Greed 歷史數據。"""
    history = await fear_greed_service.get_history_safe(days)
    return {"data": history}

