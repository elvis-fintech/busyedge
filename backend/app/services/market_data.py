"""CoinGecko 市場資料服務。"""
from __future__ import annotations

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

    def __init__(self, timeout: float = 12.0) -> None:
        self.timeout = timeout

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
        return sorted(data, key=lambda item: item.get("market_cap") or 0, reverse=True)

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
        global_data = await self.get_global_overview()
        trending = await self.get_trending()
        return {"global": global_data, "trending": trending}


coin_gecko_service = CoinGeckoService()

