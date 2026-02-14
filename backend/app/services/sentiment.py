"""Sentiment Analysis 服務 - Twitter/Reddit 情緒分析。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx
from fastapi import HTTPException


class SentimentService:
    """加密貨幣情緒分析服務。"""
    
    # 熱門幣種
    TRENDING_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX"]

    def __init__(self, timeout: float = 15.0) -> None:
        self.timeout = timeout

    async def get_overall_sentiment(self) -> dict[str, Any]:
        """取得整體市場情緒 (Overall Market Sentiment)。"""
        # Mock data - 實際應該用 real API (StockGeist, LunarCrush 等)
        # Twitter API / Reddit API 需要付費或者複雜既 OAuth
        
        return {
            "overall_score": 62,
            "overall_label": "Greed",
            "twitter_sentiment": {
                "score": 65,
                "label": "Greed",
                "mention_count": 45230,
                "change_24h": 5.2,
            },
            "reddit_sentiment": {
                "score": 58,
                "label": "Neutral",
                "mention_count": 12840,
                "change_24h": -2.1,
            },
            "news_sentiment": {
                "score": 63,
                "label": "Greed",
                "article_count": 234,
                "change_24h": 8.3,
            },
            "data_source": "mock_sentiment",
            "is_mock": True,
            "updated_at": datetime.now().isoformat(),
        }

    async def get_coin_sentiment(self, coin: str | None = None) -> dict[str, Any]:
        """取得特定幣種既情緒數據。"""
        coin = coin.upper() if coin else "BTC"
        
        # 為每個幣種生成不同既 sentiment data
        coin_data = {
            "BTC": {"score": 68, "label": "Greed", "mentions": 28500},
            "ETH": {"score": 72, "label": "Extreme Greed", "mentions": 18200},
            "SOL": {"score": 45, "label": "Fear", "mentions": 9800},
            "XRP": {"score": 55, "label": "Neutral", "mentions": 7600},
            "DOGE": {"score": 38, "label": "Fear", "mentions": 5200},
            "BNB": {"score": 61, "label": "Greed", "mentions": 4100},
            "ADA": {"score": 52, "label": "Neutral", "mentions": 3800},
            "AVAX": {"score": 48, "label": "Fear", "mentions": 2900},
        }
        
        data = coin_data.get(coin, {"score": 50, "label": "Neutral", "mentions": 1000})
        
        return {
            "coin": coin,
            "score": data["score"],
            "label": data["label"],
            "mentions_24h": data["mentions"],
            "twitter": {
                "sentiment": data["label"].lower(),
                "mentions": int(data["mentions"] * 0.6),
                "posts": [
                    {"author": f"crypto_user_{i}", "text": f"${coin} looking bullish! #crypto", "likes": 100 + i * 20}
                    for i in range(3)
                ]
            },
            "reddit": {
                "sentiment": data["label"].lower(),
                "mentions": int(data["mentions"] * 0.3),
                "posts": [
                    {"author": f"reddit_user_{i}", "title": f"Should I buy ${coin}?", "score": 50 + i * 10}
                    for i in range(3)
                ]
            },
            "news": {
                "sentiment": data["label"].lower(),
                "articles": [
                    {"title": f"${coin} surges amid market optimism", "source": "CryptoNews"},
                    {"title": f"Analysts predict ${coin} to reach new highs", "source": "CoinDesk"},
                ]
            },
            "data_source": "mock_sentiment",
            "is_mock": True,
            "updated_at": datetime.now().isoformat(),
        }

    async def get_trending_topics(self) -> list[dict[str, Any]]:
        """取得 trending topics。"""
        return [
            {"topic": "#Bitcoin", "sentiment": "bullish", "volume": 45230, "change": 5.2},
            {"topic": "#Ethereum", "sentiment": "bullish", "volume": 28400, "change": 3.8},
            {"topic": "#Solana", "sentiment": "bearish", "volume": 12800, "change": -8.5},
            {"topic": "#Memecoins", "sentiment": "neutral", "volume": 8900, "change": 1.2},
            {"topic": "#DeFi", "sentiment": "bullish", "volume": 7600, "change": 2.1},
            {"topic": "#NFT", "sentiment": "bearish", "volume": 5400, "change": -3.5},
        ]

    async def get_sentiment_history(self, days: int = 7) -> list[dict[str, Any]]:
        """取得情緒歷史數據。"""
        import random
        
        history = []
        base_score = 50
        
        for i in range(days):
            date = datetime.now().timestamp() - (days - i - 1) * 86400
            score = base_score + random.randint(-15, 15)
            score = max(0, min(100, score))
            
            if score <= 25:
                label = "Extreme Fear"
            elif score <= 45:
                label = "Fear"
            elif score <= 55:
                label = "Neutral"
            elif score <= 75:
                label = "Greed"
            else:
                label = "Extreme Greed"
            
            history.append({
                "date": datetime.fromtimestamp(date).strftime("%Y-%m-%d"),
                "score": score,
                "label": label,
            })
        
        return history


sentiment_service = SentimentService()
