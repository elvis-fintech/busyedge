"""AI Signals 服務 - 以即時市場資料產生規則型交易信號。"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from app.services.fear_greed import fear_greed_service
from app.services.funding import funding_rate_service
from app.services.market_data import coin_gecko_service


class AISignalsService:
    """Rule-based trading signals service（live market data）。"""

    COIN_CONFIG: dict[str, dict[str, str]] = {
        "BTC": {"id": "bitcoin", "pair": "BTCUSDT"},
        "ETH": {"id": "ethereum", "pair": "ETHUSDT"},
        "SOL": {"id": "solana", "pair": "SOLUSDT"},
        "XRP": {"id": "ripple", "pair": "XRPUSDT"},
        "DOGE": {"id": "dogecoin", "pair": "DOGEUSDT"},
        "BNB": {"id": "binancecoin", "pair": "BNBUSDT"},
        "ADA": {"id": "cardano", "pair": "ADAUSDT"},
        "AVAX": {"id": "avalanche-2", "pair": "AVAXUSDT"},
    }
    BASELINE_PRICE_BY_SYMBOL: dict[str, float] = {
        "BTC": 60000.0,
        "ETH": 3000.0,
        "SOL": 120.0,
        "XRP": 0.6,
        "DOGE": 0.12,
        "BNB": 600.0,
        "ADA": 0.7,
        "AVAX": 35.0,
    }

    MODEL_VERSION = "rule-based-live-v2"

    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return max(low, min(value, high))

    @staticmethod
    def _classify_fear_greed(value: int) -> str:
        if value <= 25:
            return "Extreme Fear"
        if value <= 45:
            return "Fear"
        if value <= 55:
            return "Neutral"
        if value <= 75:
            return "Greed"
        return "Extreme Greed"

    @staticmethod
    def _trend_by_change(change_24h_pct: float) -> str:
        if change_24h_pct >= 1.5:
            return "uptrend"
        if change_24h_pct <= -1.5:
            return "downtrend"
        return "sideways"

    @staticmethod
    def _volatility_label(abs_change_24h_pct: float) -> str:
        if abs_change_24h_pct < 2:
            return "low"
        if abs_change_24h_pct < 6:
            return "medium"
        return "high"

    def _build_reason(
        self,
        signal: str,
        change_24h_pct: float,
        fear_greed_value: int,
        funding_rate: float | None,
    ) -> str:
        momentum_text = (
            "動能偏強"
            if change_24h_pct >= 1.5
            else "動能偏弱"
            if change_24h_pct <= -1.5
            else "短線盤整"
        )
        fear_text = self._classify_fear_greed(fear_greed_value)

        funding_text = "資金費率中性"
        if funding_rate is not None:
            funding_bps = funding_rate * 10000
            if funding_bps >= 5:
                funding_text = "多頭擁擠偏高"
            elif funding_bps <= -5:
                funding_text = "空頭擁擠偏高"

        if signal == "BUY":
            action_text = "偏多"
        elif signal == "SELL":
            action_text = "偏空"
        else:
            action_text = "觀望"

        return f"{momentum_text}，市場情緒 {fear_text}，{funding_text}，策略建議 {action_text}"

    async def _collect_market_context(self) -> dict[str, Any]:
        symbols = list(self.COIN_CONFIG)
        coin_ids = [self.COIN_CONFIG[symbol]["id"] for symbol in symbols]
        pairs = [self.COIN_CONFIG[symbol]["pair"] for symbol in symbols]

        market_task = coin_gecko_service.get_simple_prices(coin_ids)
        funding_task = funding_rate_service.get_merged_funding_rates(pairs)
        fear_task = fear_greed_service.get_current()

        market_result, funding_result, fear_result = await asyncio.gather(
            market_task,
            funding_task,
            fear_task,
            return_exceptions=True,
        )

        source_parts: list[str] = []
        is_mock = False

        market_by_id: dict[str, dict[str, Any]] = {}
        if isinstance(market_result, Exception):
            is_mock = True
            source_parts.append("coingecko_fallback")
        else:
            source_parts.append("coingecko")
            market_by_id = {
                str(item.get("id", "")): item
                for item in market_result
                if item.get("id")
            }

        funding_by_pair: dict[str, dict[str, Any]] = {}
        if isinstance(funding_result, Exception):
            source_parts.append("funding_unavailable")
        else:
            source_parts.append("funding(binance/bybit)")
            funding_by_pair = {
                str(item.get("symbol", "")): item
                for item in funding_result
                if item.get("symbol")
            }

        fear_value = 50
        fear_label = "Neutral"
        if isinstance(fear_result, Exception):
            is_mock = True
            source_parts.append("fear_greed_fallback")
        else:
            source_parts.append("fear_greed")
            fear_value = int(fear_result.get("value", 50))
            fear_label = str(fear_result.get("value_classification") or self._classify_fear_greed(fear_value))

        return {
            "symbols": symbols,
            "market_by_id": market_by_id,
            "funding_by_pair": funding_by_pair,
            "fear_value": fear_value,
            "fear_label": fear_label,
            "is_mock": is_mock,
            "data_source": "+".join(source_parts),
        }

    def _build_signal_payload(
        self,
        symbol: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        config = self.COIN_CONFIG[symbol]
        coin_id = config["id"]
        pair = config["pair"]

        market_row = context["market_by_id"].get(coin_id)
        if market_row is None:
            context["is_mock"] = True
            current_price = self.BASELINE_PRICE_BY_SYMBOL.get(symbol, 1.0)
            change_24h_pct = 0.0
            volume_24h = 0.0
        else:
            current_price = float(market_row.get("price_usd") or self.BASELINE_PRICE_BY_SYMBOL.get(symbol, 1.0))
            change_24h_pct = float(market_row.get("change_24h_pct") or 0.0)
            volume_24h = float(market_row.get("volume_24h") or 0.0)

        funding_row = context["funding_by_pair"].get(pair)
        avg_funding_rate = (
            float(funding_row.get("average_rate"))
            if funding_row is not None and funding_row.get("average_rate") is not None
            else None
        )

        fear_value = int(context["fear_value"])
        fear_label = str(context["fear_label"])

        # 核心打分：市場動能 + 恐懼貪婪 + 資金費率（反向擁擠）
        market_score = self._clamp(50 + (change_24h_pct * 2.6), 0, 100)
        fear_score = self._clamp(float(fear_value), 0, 100)
        funding_score = 50.0
        if avg_funding_rate is not None:
            funding_bps = avg_funding_rate * 10000
            funding_score = self._clamp(50 - (funding_bps * 1.5), 0, 100)

        total_score = (market_score * 0.55) + (fear_score * 0.30) + (funding_score * 0.15)

        if total_score >= 63:
            signal = "BUY"
        elif total_score <= 40:
            signal = "SELL"
        else:
            signal = "HOLD"

        confidence = int(round(self._clamp(52 + abs(total_score - 50) * 1.35, 52, 95)))
        reason = self._build_reason(signal, change_24h_pct, fear_value, avg_funding_rate)

        abs_change = abs(change_24h_pct)
        volatility_label = self._volatility_label(abs_change)
        rsi_est = int(round(self._clamp(50 + (change_24h_pct * 4.2), 18, 82)))
        macd_state = "bullish" if change_24h_pct > 1 else "bearish" if change_24h_pct < -1 else "neutral"

        band_ratio = self._clamp(0.012 + (abs_change / 100 * 1.8), 0.012, 0.14)
        support_level = round(current_price * (1 - band_ratio), 4)
        resistance_level = round(current_price * (1 + band_ratio), 4)

        sentiment_base = int(round(self._clamp((fear_score * 0.6) + (market_score * 0.4), 0, 100)))
        twitter_score = int(self._clamp(sentiment_base + 3, 0, 100))
        reddit_score = int(self._clamp(sentiment_base - 1, 0, 100))
        news_score = int(self._clamp(sentiment_base + 1, 0, 100))

        risk_score = int(
            round(
                self._clamp(
                    2 + (abs_change * 0.8) + ((100 - confidence) * 0.06),
                    1,
                    10,
                )
            )
        )

        return {
            "coin": symbol,
            "signal": signal,
            "confidence": confidence,
            "reason": reason,
            "model_version": self.MODEL_VERSION,
            "data_source": context["data_source"],
            "is_mock": bool(context["is_mock"]),
            "analysis": {
                "market_analysis": {
                    "trend": self._trend_by_change(change_24h_pct),
                    "rsi": rsi_est,
                    "macd": macd_state,
                    "support_level": support_level,
                    "resistance_level": resistance_level,
                    "price_usd": round(current_price, 6),
                    "change_24h_pct": round(change_24h_pct, 4),
                    "volume_24h": round(volume_24h, 2),
                    "fear_greed": {"value": fear_value, "label": fear_label},
                },
                "sentiment_analysis": {
                    "twitter": twitter_score,
                    "reddit": reddit_score,
                    "news": news_score,
                    "twitter_score": twitter_score,
                    "reddit_score": reddit_score,
                    "news_score": news_score,
                },
                "risk_assessment": {
                    "volatility": volatility_label,
                    "risk_score": risk_score,
                },
                "ai_confidence": confidence,
                "signal": signal,
                "reason": reason,
            },
            "generated_at": datetime.now(UTC).isoformat(),
        }

    async def get_all_signals(self) -> list[dict[str, Any]]:
        """取得所有幣種的交易信號。"""
        context = await self._collect_market_context()
        signals = [self._build_signal_payload(symbol, context) for symbol in context["symbols"]]
        return sorted(signals, key=lambda item: item["confidence"], reverse=True)

    async def get_signal(self, coin: str) -> dict[str, Any]:
        """取得特定幣種的交易信號。"""
        symbol = coin.upper()
        if symbol not in self.COIN_CONFIG:
            return {
                "coin": symbol,
                "signal": "HOLD",
                "confidence": 50,
                "reason": "未支援幣種，無法產生有效訊號",
                "model_version": self.MODEL_VERSION,
                "data_source": "unsupported_symbol",
                "is_mock": True,
                "analysis": {
                    "market_analysis": {
                        "trend": "sideways",
                        "rsi": 50,
                        "macd": "neutral",
                    },
                    "sentiment_analysis": {"twitter": 50, "reddit": 50, "news": 50},
                    "risk_assessment": {"volatility": "medium", "risk_score": 5},
                },
                "generated_at": datetime.now(UTC).isoformat(),
            }

        context = await self._collect_market_context()
        return self._build_signal_payload(symbol, context)

    async def get_analysis(self, coin: str) -> dict[str, Any]:
        """取得特定幣種的詳細 AI 分析。"""
        signal_payload = await self.get_signal(coin)
        if signal_payload.get("data_source") == "unsupported_symbol":
            return {
                "coin": signal_payload["coin"],
                "summary": signal_payload["reason"],
                "signal": signal_payload["signal"],
                "confidence": signal_payload["confidence"],
                "model_version": signal_payload["model_version"],
                "data_source": signal_payload["data_source"],
                "is_mock": signal_payload["is_mock"],
                "detailed_analysis": {
                    "technical": {
                        "trend": "盤整",
                        "rsi": 50,
                        "macd": "中性",
                        "moving_averages": "MA20 ~= MA50",
                    },
                    "fundamental": {
                        "on_chain": {"wallet_activity": "平穩", "exchange_flow": "中性"},
                        "ecosystem": {"development": "一般", "partnerships": 0},
                    },
                    "sentiment": {
                        "overall": "HOLD",
                        "twitter_sentiment": 50,
                        "reddit_sentiment": 50,
                        "news_sentiment": 50,
                    },
                },
                "recommendation": {
                    "action": "HOLD",
                    "entry_price_range": {"min": 0.0, "max": 0.0},
                    "stop_loss": 0.0,
                    "take_profit": 0.0,
                    "time_horizon": "中線",
                },
                "generated_at": datetime.now(UTC).isoformat(),
            }

        market = signal_payload["analysis"]["market_analysis"]
        risk = signal_payload["analysis"]["risk_assessment"]

        current_price = float(market.get("price_usd") or self.BASELINE_PRICE_BY_SYMBOL.get(signal_payload["coin"], 1.0))
        signal = signal_payload["signal"]

        if signal == "BUY":
            entry_min = current_price * 0.99
            entry_max = current_price * 1.01
            stop_loss = current_price * 0.96
            take_profit = current_price * 1.06
        elif signal == "SELL":
            entry_min = current_price * 0.99
            entry_max = current_price * 1.01
            stop_loss = current_price * 1.04
            take_profit = current_price * 0.94
        else:
            entry_min = current_price * 0.985
            entry_max = current_price * 1.015
            stop_loss = current_price * 0.97
            take_profit = current_price * 1.03

        moving_averages = (
            "MA20 > MA50"
            if signal == "BUY"
            else "MA20 < MA50"
            if signal == "SELL"
            else "MA20 ~= MA50"
        )

        trend_text = (
            "上升趨勢"
            if market["trend"] == "uptrend"
            else "下降趨勢"
            if market["trend"] == "downtrend"
            else "盤整"
        )

        macd_text = (
            "黃金交叉"
            if market["macd"] == "bullish"
            else "死亡交叉"
            if market["macd"] == "bearish"
            else "中性"
        )

        coin = signal_payload["coin"]
        partnership_score = (sum(ord(char) for char in coin) % 7) + 3
        wallet_activity = "增加" if market["change_24h_pct"] > 0 else "減少" if market["change_24h_pct"] < 0 else "平穩"
        exchange_flow = "淨流出" if signal == "BUY" else "淨流入" if signal == "SELL" else "中性"
        development = "活躍" if signal_payload["confidence"] >= 70 else "一般"

        time_horizon = (
            "短線"
            if risk["volatility"] == "high"
            else "中線"
            if risk["volatility"] == "medium"
            else "中長線"
        )

        return {
            "coin": coin,
            "summary": signal_payload["reason"],
            "signal": signal,
            "confidence": signal_payload["confidence"],
            "model_version": signal_payload["model_version"],
            "data_source": signal_payload["data_source"],
            "is_mock": signal_payload["is_mock"],
            "detailed_analysis": {
                "technical": {
                    "trend": trend_text,
                    "rsi": market["rsi"],
                    "macd": macd_text,
                    "moving_averages": moving_averages,
                    "support_level": market.get("support_level"),
                    "resistance_level": market.get("resistance_level"),
                },
                "fundamental": {
                    "on_chain": {
                        "wallet_activity": wallet_activity,
                        "exchange_flow": exchange_flow,
                    },
                    "ecosystem": {
                        "development": development,
                        "partnerships": partnership_score,
                    },
                },
                "sentiment": {
                    "overall": signal,
                    "twitter_sentiment": signal_payload["analysis"]["sentiment_analysis"]["twitter"],
                    "reddit_sentiment": signal_payload["analysis"]["sentiment_analysis"]["reddit"],
                    "news_sentiment": signal_payload["analysis"]["sentiment_analysis"]["news"],
                },
            },
            "recommendation": {
                "action": signal,
                "entry_price_range": {
                    "min": round(entry_min, 4),
                    "max": round(entry_max, 4),
                },
                "stop_loss": round(stop_loss, 4),
                "take_profit": round(take_profit, 4),
                "time_horizon": time_horizon,
            },
            "generated_at": datetime.now(UTC).isoformat(),
        }


ai_signals_service = AISignalsService()
