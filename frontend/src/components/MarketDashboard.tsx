'use client'

import { useCallback, useEffect, useState } from 'react'

import type { DashboardData, FearGreedIndex, FundingSource } from '../lib/api'
import { fetchMarketDashboard, fetchFearGreedIndex } from '../lib/api'

function formatCurrency(value: number | null, compact = false): string {
  if (value === null) {
    return '--'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 4,
  }).format(value)
}

function formatPercent(value: number | null, multiply = 1, digits = 2): string {
  if (value === null) {
    return '--'
  }

  return `${(value * multiply).toFixed(digits)}%`
}

function formatFundingRate(source: FundingSource | null): string {
  return formatPercent(source?.funding_rate ?? null, 100, 4)
}

function formatNextFundingTime(source: FundingSource | null): string {
  const time = source?.next_funding_time
  if (!time) {
    return '--'
  }

  const parsed = typeof time === 'number' ? new Date(time) : new Date(String(time))
  if (Number.isNaN(parsed.getTime())) {
    return '--'
  }

  return parsed.toLocaleString()
}

function getFearGreedColor(value: number): string {
  if (value <= 25) return 'bg-red-500' // Extreme Fear
  if (value <= 45) return 'bg-orange-500' // Fear
  if (value <= 55) return 'bg-yellow-500' // Neutral
  if (value <= 75) return 'bg-lime-500' // Greed
  return 'bg-green-500' // Extreme Greed
}

function getFearGreedLabel(value: number): string {
  if (value <= 25) return 'Extreme Fear'
  if (value <= 45) return 'Fear'
  if (value <= 55) return 'Neutral'
  if (value <= 75) return 'Greed'
  return 'Extreme Greed'
}

export default function MarketDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [fearGreed, setFearGreed] = useState<FearGreedIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 集中處理 API 請求，避免畫面與資料狀態不同步
      const [dashboardData, fgData] = await Promise.all([
        fetchMarketDashboard(),
        fetchFearGreedIndex(),
      ])
      setDashboard(dashboardData)
      setFearGreed(fgData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (loading && !dashboard) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">載入市場資料中...</p>
        </div>
      </section>
    )
  }

  if (error && !dashboard) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <p className="font-semibold text-red-700">無法載入儀表板：{error}</p>
          <button
            onClick={() => void loadDashboard()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </section>
    )
  }

  if (!dashboard) {
    return null
  }

  const global = dashboard.overview.global

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">BusyEdge Market Dashboard</h1>
        <button
          onClick={() => void loadDashboard()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          重新整理
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          更新資料時發生錯誤：{error}
        </p>
      ) : null}

      {/* Fear & Greed Index */}
      {fearGreed && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Fear & Greed Index</h2>
              <p className="mt-1 text-sm text-slate-500">
                更新時間：{fearGreed.time_updated}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-4xl font-bold text-slate-900">{fearGreed.value}</p>
                <p className={`text-sm font-medium ${getFearGreedColor(fearGreed.value).replace('bg-', 'text-')}`}>
                  {fearGreed.value_classification}
                </p>
              </div>
              <div className={`h-16 w-16 rounded-full ${getFearGreedColor(fearGreed.value)} flex items-center justify-center`}>
                <span className="text-2xl text-white">
                  {fearGreed.value <= 50 ? '😰' : '😎'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${getFearGreedColor(fearGreed.value)} transition-all duration-500`}
              style={{ width: `${fearGreed.value}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">總市值</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(global.total_market_cap_usd, true)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">24h 交易量</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatCurrency(global.total_volume_24h_usd, true)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">BTC Dominance</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatPercent(global.btc_dominance_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">市場 24h 變化</p>
          <p
            className={`mt-2 text-lg font-semibold ${
              (global.market_cap_change_24h_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatPercent(global.market_cap_change_24h_pct)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Market Overview</h2>
          <span className="text-sm text-slate-500">
            更新時間：{new Date(dashboard.generated_at).toLocaleString()}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">交易所數量</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{global.markets ?? '--'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">幣種數量</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {global.active_cryptocurrencies ?? '--'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">ETH Dominance</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {formatPercent(global.eth_dominance_pct)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">趨勢幣種</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {dashboard.overview.trending.length}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {dashboard.overview.trending.slice(0, 8).map((coin) => (
            <span
              key={coin.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {coin.symbol.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Prices</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">24h</th>
                <th className="px-4 py-3 font-medium">Market Cap</th>
                <th className="px-4 py-3 font-medium">Volume 24h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.prices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.symbol.toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.price_usd)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      (item.change_24h_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatPercent(item.change_24h_pct)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.market_cap, true)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.volume_24h, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Funding Rates</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Binance</th>
                <th className="px-4 py-3 font-medium">Bybit</th>
                <th className="px-4 py-3 font-medium">Average</th>
                <th className="px-4 py-3 font-medium">Next Funding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.funding.map((item) => (
                <tr key={item.symbol} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.symbol}</td>
                  <td className="px-4 py-3 text-slate-700">{formatFundingRate(item.binance)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatFundingRate(item.bybit)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPercent(item.average_rate, 100, 4)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatNextFundingTime(item.binance) !== '--'
                      ? formatNextFundingTime(item.binance)
                      : formatNextFundingTime(item.bybit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
