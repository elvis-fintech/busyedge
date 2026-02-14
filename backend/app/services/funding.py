"""Funding rates 服務（Binance / Bybit）。"""
from __future__ import annotations

from typing import Any

import httpx


class FundingRateService:
    DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    BINANCE_URL = "https://fapi.binance.com/fapi/v1/premiumIndex"
    BYBIT_URL = "https://api.bybit.com/v5/market/tickers"

    def __init__(self, timeout: float = 12.0) -> None:
        self.timeout = timeout

    async def _fetch_binance(self, symbols: list[str]) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.BINANCE_URL)
            response.raise_for_status()
            payload = response.json()

        raw_items = payload if isinstance(payload, list) else [payload]
        symbol_set = set(symbols)
        data: list[dict[str, Any]] = []

        for item in raw_items:
            symbol = item.get("symbol")
            if symbol not in symbol_set:
                continue
            data.append(
                {
                    "symbol": symbol,
                    "source": "binance",
                    "funding_rate": float(item.get("lastFundingRate", 0)),
                    "next_funding_time": item.get("nextFundingTime"),
                }
            )
        return data

    async def _fetch_bybit(self, symbols: list[str]) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.BYBIT_URL, params={"category": "linear"})
            response.raise_for_status()
            payload = response.json()

        rows = payload.get("result", {}).get("list", [])
        symbol_set = set(symbols)
        data: list[dict[str, Any]] = []

        for item in rows:
            symbol = item.get("symbol")
            if symbol not in symbol_set:
                continue
            funding_rate = item.get("fundingRate")
            data.append(
                {
                    "symbol": symbol,
                    "source": "bybit",
                    "funding_rate": float(funding_rate) if funding_rate is not None else None,
                    "next_funding_time": item.get("nextFundingTime"),
                }
            )
        return data

    async def get_merged_funding_rates(
        self, symbols: list[str] | None = None
    ) -> list[dict[str, Any]]:
        targets = symbols or self.DEFAULT_SYMBOLS

        binance_data: list[dict[str, Any]]
        bybit_data: list[dict[str, Any]]

        # 單一來源失敗不應讓整體儀表板直接掛掉
        try:
            binance_data = await self._fetch_binance(targets)
        except (httpx.RequestError, httpx.HTTPStatusError):
            binance_data = []

        try:
            bybit_data = await self._fetch_bybit(targets)
        except (httpx.RequestError, httpx.HTTPStatusError):
            bybit_data = []

        combined: dict[str, dict[str, Any]] = {
            symbol: {"symbol": symbol, "binance": None, "bybit": None, "average_rate": None}
            for symbol in targets
        }

        for row in binance_data:
            combined[row["symbol"]]["binance"] = {
                "funding_rate": row["funding_rate"],
                "next_funding_time": row.get("next_funding_time"),
            }

        for row in bybit_data:
            combined[row["symbol"]]["bybit"] = {
                "funding_rate": row["funding_rate"],
                "next_funding_time": row.get("next_funding_time"),
            }

        for symbol, row in combined.items():
            rates = []
            if row["binance"] and row["binance"]["funding_rate"] is not None:
                rates.append(row["binance"]["funding_rate"])
            if row["bybit"] and row["bybit"]["funding_rate"] is not None:
                rates.append(row["bybit"]["funding_rate"])
            if rates:
                row["average_rate"] = sum(rates) / len(rates)
            combined[symbol] = row

        return list(combined.values())


funding_rate_service = FundingRateService()

