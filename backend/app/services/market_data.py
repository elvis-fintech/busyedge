"""CoinGecko 市場資料服務。"""
from __future__ import annotations

from copy import deepcopy
from time import time
from typing import Any

import httpx
from fastapi import HTTPException


class CoinGeckoService:
    """封裝 CoinGecko 免費 API。"""

    BASE_URL = "https://api.coingecko.com/api/v3"
    DEFAULT_COIN_IDS = ["bitcoin", "ethereum", "solana", "ripple", "dogecoin"]
    COIN_SYMBOL_MAP = {
        "bitcoin": "BTC",
        "ethereum": "ETH",
        "solana": "SOL",
        "ripple": "XRP",
        "dogecoin": "DOGE",
    }

    def __init__(self, timeout: float = 12.0, cache_ttl_seconds: int = 60) -> None:
        self.timeout = timeout
        self.cache_ttl_seconds = cache_ttl_seconds
        self._simple_prices_cache: dict[str, dict[str, Any]] = {}
        self._overview_cache: dict[str, Any] | None = None

    def _is_cache_fresh(self, cached_at: float) -> bool:
        return (time() - cached_at) <= self.cache_ttl_seconds

    @staticmethod
    def _simple_prices_cache_key(coin_ids: list[str] | None) -> str:
        if not coin_ids:
            return ",".join(CoinGeckoService.DEFAULT_COIN_IDS)
        return ",".join(coin_ids)

    def get_cached_simple_prices(self, coin_ids: list[str] | None = None) -> list[dict[str, Any]] | None:
        key = self._simple_prices_cache_key(coin_ids)
        entry = self._simple_prices_cache.get(key)
        if entry is not None:
            return deepcopy(entry["data"])

        # 若要求的是子集合，嘗試從較大的快取集合切分，降低 429 風險。
        requested = set(coin_ids or self.DEFAULT_COIN_IDS)
        for cached_entry in self._simple_prices_cache.values():
            rows = cached_entry["data"]
            row_by_id = {str(row.get("id")): row for row in rows if row.get("id")}
            if requested.issubset(set(row_by_id)):
                sliced = [row_by_id[coin_id] for coin_id in (coin_ids or self.DEFAULT_COIN_IDS)]
                return deepcopy(sliced)
        return None

    def get_fresh_cached_simple_prices(self, coin_ids: list[str] | None = None) -> list[dict[str, Any]] | None:
        key = self._simple_prices_cache_key(coin_ids)
        entry = self._simple_prices_cache.get(key)
        if entry is None:
            return None
        if not self._is_cache_fresh(float(entry["cached_at"])):
            return None
        return deepcopy(entry["data"])

    def get_cached_market_overview(self) -> dict[str, Any] | None:
        if self._overview_cache is None:
            return None
        return deepcopy(self._overview_cache["data"])

    def get_fresh_cached_market_overview(self) -> dict[str, Any] | None:
        if self._overview_cache is None:
            return None
        if not self._is_cache_fresh(float(self._overview_cache["cached_at"])):
            return None
        return deepcopy(self._overview_cache["data"])

    async def _request_json(
        self, endpoint: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        url = f"{self.BASE_URL}{endpoint}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"CoinGecko API 錯誤: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="無法連線 CoinGecko API") from exc

    async def get_simple_prices(self, coin_ids: list[str] | None = None) -> list[dict[str, Any]]:
        ids = coin_ids or self.DEFAULT_COIN_IDS
        fresh_cached = self.get_fresh_cached_simple_prices(ids)
        if fresh_cached is not None:
            return fresh_cached

        try:
            payload = await self._request_json(
                "/simple/price",
                {
                    "ids": ",".join(ids),
                    "vs_currencies": "usd",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                    "include_24hr_change": "true",
                    "include_last_updated_at": "true",
                },
            )
        except HTTPException as exc:
            cached = self.get_cached_simple_prices(ids)
            if cached is not None:
                return cached
            raise exc

        data: list[dict[str, Any]] = []
        for coin_id in ids:
            if coin_id not in payload:
                continue

            coin_data = payload[coin_id]
            data.append(
                {
                    "id": coin_id,
                    "symbol": self.COIN_SYMBOL_MAP.get(coin_id, coin_id.upper()),
                    "price_usd": coin_data.get("usd"),
                    "market_cap": coin_data.get("usd_market_cap"),
                    "volume_24h": coin_data.get("usd_24h_vol"),
                    "change_24h_pct": coin_data.get("usd_24h_change"),
                    "last_updated_at": coin_data.get("last_updated_at"),
                }
            )

        # 以市值排序，讓前端顯示更直覺
        sorted_data = sorted(data, key=lambda item: item.get("market_cap") or 0, reverse=True)
        cache_key = self._simple_prices_cache_key(ids)
        self._simple_prices_cache[cache_key] = {"cached_at": time(), "data": deepcopy(sorted_data)}
        return sorted_data

    async def get_trending(self, limit: int = 5) -> list[dict[str, Any]]:
        payload = await self._request_json("/search/trending")
        coins = payload.get("coins", [])

        data: list[dict[str, Any]] = []
        for entry in coins[:limit]:
            item = entry.get("item", {})
            data.append(
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "symbol": item.get("symbol"),
                    "market_cap_rank": item.get("market_cap_rank"),
                    "thumb": item.get("thumb"),
                    "score": item.get("score"),
                }
            )
        return data

    async def get_global_overview(self) -> dict[str, Any]:
        payload = await self._request_json("/global")
        data = payload.get("data", {})
        total_market_cap = data.get("total_market_cap", {})
        total_volume = data.get("total_volume", {})
        market_cap_percentage = data.get("market_cap_percentage", {})

        return {
            "active_cryptocurrencies": data.get("active_cryptocurrencies"),
            "markets": data.get("markets"),
            "total_market_cap_usd": total_market_cap.get("usd"),
            "total_volume_24h_usd": total_volume.get("usd"),
            "btc_dominance_pct": market_cap_percentage.get("btc"),
            "eth_dominance_pct": market_cap_percentage.get("eth"),
            "market_cap_change_24h_pct": data.get("market_cap_change_percentage_24h_usd"),
        }

    async def get_market_overview(self) -> dict[str, Any]:
        fresh_cached = self.get_fresh_cached_market_overview()
        if fresh_cached is not None:
            return fresh_cached

        try:
            global_data = await self.get_global_overview()
            trending = await self.get_trending()
            overview = {"global": global_data, "trending": trending}
            self._overview_cache = {"cached_at": time(), "data": deepcopy(overview)}
            return overview
        except HTTPException as exc:
            cached = self.get_cached_market_overview()
            if cached is not None:
                return cached
            raise exc


coin_gecko_service = CoinGeckoService()

