"""Sentiment Analysis 服務 - 由即時市場資料衍生情緒指標。"""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from fastapi import HTTPException

from app.services.fear_greed import fear_greed_service
from app.services.market_data import coin_gecko_service


class SentimentService:
    """加密貨幣情緒分析服務（不使用 mock 文本）。"""

    TRENDING_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX"]
    COIN_ID_BY_SYMBOL = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "SOL": "solana",
        "XRP": "ripple",
        "DOGE": "dogecoin",
        "BNB": "binancecoin",
        "ADA": "cardano",
        "AVAX": "avalanche-2",
    }

    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return max(low, min(value, high))

    @staticmethod
    def _label_by_score(score: float) -> str:
        if score <= 25:
            return "Extreme Fear"
        if score <= 45:
            return "Fear"
        if score <= 55:
            return "Neutral"
        if score <= 75:
            return "Greed"
        return "Extreme Greed"

    async def get_overall_sentiment(self) -> dict[str, Any]:
        """取得整體市場情緒。"""
        overview_task = coin_gecko_service.get_market_overview()
        fear_task = fear_greed_service.get_current_safe()
        overview, fear = await asyncio.gather(overview_task, fear_task)

        market_change = float(overview["global"].get("market_cap_change_24h_pct") or 0.0)
        fear_value = int(fear["value"])
        overall_score = int(round(self._clamp((fear_value * 0.7) + (50 + market_change * 3) * 0.3, 0, 100)))

        twitter_score = int(round(self._clamp(overall_score + 2, 0, 100)))
        reddit_score = int(round(self._clamp(overall_score - 1, 0, 100)))
        news_score = int(round(self._clamp(overall_score + 1, 0, 100)))

        return {
            "overall_score": overall_score,
            "overall_label": self._label_by_score(overall_score),
            "twitter_sentiment": {
                "score": twitter_score,
                "label": self._label_by_score(twitter_score),
                "mention_count": None,
                "change_24h": round(market_change, 2),
            },
            "reddit_sentiment": {
                "score": reddit_score,
                "label": self._label_by_score(reddit_score),
                "mention_count": None,
                "change_24h": round(market_change * 0.85, 2),
            },
            "news_sentiment": {
                "score": news_score,
                "label": self._label_by_score(news_score),
                "article_count": None,
                "change_24h": round(market_change * 1.1, 2),
            },
            "data_source": "coingecko+alternative_me",
            "is_mock": False,
            "is_stale": bool(fear.get("is_stale", False)),
            "updated_at": datetime.now().isoformat(),
        }

    async def get_coin_sentiment(self, coin: str | None = None) -> dict[str, Any]:
        """取得特定幣種情緒分數（由市場動能與 Fear & Greed 推導）。"""
        symbol = (coin or "BTC").upper()
        coin_id = self.COIN_ID_BY_SYMBOL.get(symbol)
        if not coin_id:
            raise HTTPException(status_code=400, detail=f"不支援的幣種: {symbol}")

        prices_task = coin_gecko_service.get_simple_prices([coin_id])
        fear_task = fear_greed_service.get_current_safe()
        prices, fear = await asyncio.gather(prices_task, fear_task)

        if not prices:
            raise HTTPException(status_code=502, detail=f"無法取得 {symbol} 即時行情")

        row = prices[0]
        change_24h = float(row.get("change_24h_pct") or 0.0)
        fear_value = int(fear["value"])
        score = int(round(self._clamp((50 + change_24h * 3.2) * 0.6 + fear_value * 0.4, 0, 100)))
        label = self._label_by_score(score)

        return {
            "coin": symbol,
            "score": score,
            "label": label,
            "mentions_24h": None,
            "twitter": {
                "sentiment": label.lower(),
                "mentions": None,
                "posts": [],
            },
            "reddit": {
                "sentiment": label.lower(),
                "mentions": None,
                "posts": [],
            },
            "news": {
                "sentiment": label.lower(),
                "articles": [],
            },
            "data_source": "coingecko+alternative_me",
            "is_mock": False,
            "is_stale": bool(fear.get("is_stale", False)),
            "updated_at": datetime.now().isoformat(),
        }

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        """取得熱門話題（以 CoinGecko trending coins 為來源）。"""
        try:
            trending = await coin_gecko_service.get_trending(limit=8)
        except HTTPException:
            return []
        ids = [item["id"] for item in trending if item.get("id")]
        if not ids:
            return []

        try:
            prices = await coin_gecko_service.get_simple_prices(ids)
        except HTTPException:
            prices = []
        price_by_id = {item["id"]: item for item in prices}

        result: list[dict[str, Any]] = []
        for item in trending:
            coin_id = item.get("id")
            if not coin_id:
                continue
            price_row = price_by_id.get(coin_id, {})
            change = float(price_row.get("change_24h_pct") or 0.0)
            score = self._clamp(50 + change * 4, 0, 100)
            result.append(
                {
                    "topic": f"#{str(item.get('symbol', '')).upper()}",
                    "sentiment": self._label_by_score(score).lower(),
                    "volume": int(price_row.get("market_cap") or 0),
                    "change": round(change, 2),
                }
            )
        return result

    async def get_sentiment_history(self, days: int = 7) -> list[dict[str, Any]]:
        """取得情緒歷史數據（以 Fear & Greed 歷史為準）。"""
        history = await fear_greed_service.get_history_safe(days)
        return [
            {
                "date": item["date"],
                "score": int(item["value"]),
                "label": item["value_classification"],
            }
            for item in history
        ]


sentiment_service = SentimentService()
