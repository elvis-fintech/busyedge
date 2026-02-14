"""Whale Tracking 服務 - On-chain 大額轉賬追蹤。"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException


# Etherscan API (需要免費API key)
ETHERSCAN_API_KEY = "YourEtherscanAPIKey"
ETHERSCAN_BASE_URL = "https://api.etherscan.io/api"

# 交易所地址 (主要 ETH 錢包)
EXCHANGE_ADDRESSES = {
    "0x3f5CE5FBFe3E9af3971dD833Dc26FF900aF1a": "Binance",
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72": "Coinbase",
    "0x28c6c06298d514Db089934071355E5743bf21d0": "Binance Cold",
    "0xA910f92ACdAf488fa6eF021893d3eD2e39D388": "Kraken",
    "0x5C985E89DDe482eFE97EA9fF0aB1C7Fe05eB": "OKX",
}


class WhaleTrackingService:
    """追蹤大額鏈上轉賬 (Whale Tracking)。"""

    # 定義大額閾值 (USD)
    WHALE_THRESHOLD_USD = 100000  # $100k 以上為大額

    def __init__(self, timeout: float = 15.0) -> None:
        self.timeout = timeout
        self.exchange_addresses = EXCHANGE_ADDRESSES

    async def get_recent_transactions(
        self, address: str | None = None, min_value_usd: float = 10000
    ) -> list[dict[str, Any]]:
        """取得最近大額轉賬        
        Note: Etherscan 。
免費 API 有 rate limit，呢度用 mock data 演示。
        production 應該用 paid API 或其他服務 (e.g., Dune, Arkham)。
        """
        # Mock data - 實際 production 要接 real API
        mock_transactions = [
            {
                "hash": "0x1234...abcd",
                "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f",
                "to": "0x5C985E89DDe482eFE97EA9fF0aB1C7Fe05eB",
                "value_eth": 125.5,
                "value_usd": 312875,
                "timestamp": 1707878400,
                "type": "outflow",  # 出交易所
            },
            {
                "hash": "0xabcd...1234",
                "from": "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
                "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f",
                "value_eth": 89.2,
                "value_usd": 223000,
                "timestamp": 1707792000,
                "type": "inflow",  # 入交易所
            },
            {
                "hash": "0x5678...efgh",
                "from": "0x3f5CE5FBFe3E9af3971dD833Dc26FF900aF1a",
                "to": "0x9abc...def0",
                "value_eth": 450.0,
                "value_usd": 1125000,
                "timestamp": 1707705600,
                "type": "outflow",
            },
            {
                "hash": "0xefgh...5678",
                "from": "0x28c6c06298d514Db089934071355E5743bf21d0",
                "to": "0x1111...2222",
                "value_eth": 234.8,
                "value_usd": 587000,
                "timestamp": 1707619200,
                "type": "outflow",
            },
        ]

        # Filter by minimum value
        filtered = [tx for tx in mock_transactions if tx["value_usd"] >= min_value_usd]
        return sorted(filtered, key=lambda x: x["timestamp"], reverse=True)

    async def get_exchange_flows(self) -> dict[str, Any]:
        """取得交易所資金流向 (In/Out Flow)。"""
        # Mock data for demonstration
        # Production: 應該用 on-chain data 服務 (e.g., Glassnode, Nansen)
        return {
            "binance": {"inflow_eth": 15420.5, "outflow_eth": 12350.2, "net_eth": 3070.3},
            "coinbase": {"inflow_eth": 8920.1, "outflow_eth": 11240.5, "net_eth": -2320.4},
            "bybit": {"inflow_eth": 6780.3, "outflow_eth": 5890.1, "net_eth": 890.2},
            "okx": {"inflow_eth": 4230.0, "outflow_eth": 5100.5, "net_eth": -870.5},
            "kraken": {"inflow_eth": 2150.8, "outflow_eth": 1890.3, "net_eth": 260.5},
        }

    async def get_whale_summary(self) -> dict[str, Any]:
        """取得鯨魚活動摘要 (Whale Activity Summary)。"""
        recent_tx = await self.get_recent_transactions(min_value_usd=10000)
        exchange_flows = await self.get_exchange_flows()

        # 計算總額
        total_inflow = sum(flow["net_eth"] for flow in exchange_flows.values() if flow["net_eth"] > 0)
        total_outflow = sum(abs(flow["net_eth"]) for flow in exchange_flows.values() if flow["net_eth"] < 0)

        # 計算大額轉賬數量
        large_tx_count = len([tx for tx in recent_tx if tx["value_usd"] >= 100000])

        return {
            "whale_transactions_24h": len(recent_tx),
            "large_transactions_100k": large_tx_count,
            "total_inflow_eth": round(total_inflow, 2),
            "total_outflow_eth": round(total_outflow, 2),
            "net_flow_eth": round(total_inflow - total_outflow, 2),
            "exchange_flows": exchange_flows,
            "data_source": "mock_onchain_data",
            "is_mock": True,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    async def get_whale_wallets(self) -> list[dict[str, Any]]:
        """取得追蹤中的鯨魚錢包 (Tracked Whale Wallets)。"""
        # 已知的大型錢包地址 (示例)
        # Production: 應該從 database 或 API 获取
        return [
            {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f",
                "label": "Multi-sig Wallet A",
                "total_received_eth": 45820.5,
                "total_sent_eth": 32100.2,
                "last_active": 1707878400,
            },
            {
                "address": "0x9abc123456789def123456789abcdef123456",
                "label": "DeFi Protocol Treasury",
                "total_received_eth": 125000.0,
                "total_sent_eth": 89000.0,
                "last_active": 1707792000,
            },
        ]


whale_tracking_service = WhaleTrackingService()
