'use client'

import { useCallback, useEffect, useState } from 'react'

import type { DashboardData, FearGreedIndex, FundingSource } from '../lib/api'
import { fetchMarketDashboard, fetchFearGreedIndex } from '../lib/api'
import { useLocale } from './LocaleProvider'

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
  if (value <= 25) return 'bg-red-500'
  if (value <= 45) return 'bg-orange-500'
  if (value <= 55) return 'bg-yellow-500'
  if (value <= 75) return 'bg-lime-500'
  return 'bg-green-500'
}

function getFearGreedLabel(value: number): string {
  if (value <= 25) return '極度恐懼'
  if (value <= 45) return '恐懼'
  if (value <= 55) return '中性'
  if (value <= 75) return '貪婪'
  return '極度貪婪'
}

function translateFearGreedLabel(label: string, value: number): string {
  const map: Record<string, string> = {
    'Extreme Fear': '極度恐懼',
    Fear: '恐懼',
    Neutral: '中性',
    Greed: '貪婪',
    'Extreme Greed': '極度貪婪',
  }
  return map[label] ?? getFearGreedLabel(value)
}

export default function MarketDashboard() {
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)
  const formatDateTime = (value: Date | string | number) =>
    new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'zh-HK')

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [fearGreed, setFearGreed] = useState<FearGreedIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(60) // seconds

  const loadDashboard = useCallback(async () => {
    setError(null)

    try {
      // 集中處理 API 請求，避免畫面與資料狀態不同步
      const [dashboardData, fgData] = await Promise.all([
        fetchMarketDashboard(),
        fetchFearGreedIndex(),
      ])
      setDashboard(dashboardData)
      setFearGreed(fgData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === 'en' ? 'Failed to load data' : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return
    
    const interval = setInterval(() => {
      void loadDashboard()
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [refreshInterval, loadDashboard])

  if (loading && !dashboard) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        {/* Skeleton for header */}
        <div className="mb-8 h-10 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        
        {/* Skeleton for cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
        
        {/* Skeleton for Fear & Greed */}
        <div className="mt-8 h-40 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        
        {/* Skeleton for table */}
        <div className="mt-8 h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </section>
    )
  }

  if (error && !dashboard) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadDashboard()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('重試', 'Retry')}
          </button>
        </div>
      </section>
    )
  }

  if (!dashboard) {
    return null
  }

  const global = dashboard.overview.global
  const marketIsStale = Boolean(dashboard.is_stale || fearGreed?.is_stale)

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {t('BusyEdge 市場總覽', 'BusyEdge Market Dashboard')}
        </h1>
        
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('更新', 'Updated')}: {lastUpdated.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-HK')}
            </span>
          )}
          
          {/* Refresh Interval Selector */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value={0}>{t('手動', 'Manual')}</option>
            <option value={30}>{t('30秒', '30s')}</option>
            <option value={60}>{t('1分鐘', '1m')}</option>
            <option value={300}>{t('5分鐘', '5m')}</option>
          </select>
          
          <button
            onClick={() => void loadDashboard()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('重新整理', 'Refresh')}
          </button>
          
          <button
            onClick={() => {
              if (!dashboard) return
              const csv = [
                [t('幣種', 'Symbol'), t('價格', 'Price'), '24h %', t('市值', 'Market Cap'), t('24h 成交量', '24h Volume')].join(','),
                ...dashboard.prices.map(p => [
                  p.symbol.toUpperCase(),
                  p.price_usd ?? '',
                  p.change_24h_pct ?? '',
                  p.market_cap ?? '',
                  p.volume_24h ?? '',
                ].join(','))
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${locale === 'en' ? 'prices' : '價格資料'}_${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('📥 匯出 CSV', '📥 Export CSV')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {t('更新資料時發生錯誤', 'Failed to update data')}: {error}
        </p>
      ) : null}

      <p className={`rounded-lg px-4 py-3 text-sm ${marketIsStale ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200'}`}>
        {t('資料來源', 'Data source')}: {dashboard.data_source ?? 'coingecko'} · {t('狀態', 'Status')}:{' '}
        {marketIsStale ? t('快取回退（非最新）', 'Cached fallback (not latest)') : t('即時資料', 'Live data')}
        {dashboard.stale_reasons && dashboard.stale_reasons.length > 0 ? ` · ${dashboard.stale_reasons.join(', ')}` : ''}
      </p>

      {/* Fear & Greed Index */}
      {fearGreed && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t('恐懼與貪婪指數', 'Fear & Greed Index')}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('更新時間', 'Updated at')}: {fearGreed.time_updated}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{fearGreed.value}</p>
                <p className={`text-sm font-medium ${getFearGreedColor(fearGreed.value).replace('bg-', 'text-')}`}>
                  {locale === 'en'
                    ? fearGreed.value_classification
                    : translateFearGreedLabel(fearGreed.value_classification, fearGreed.value)}
                </p>
              </div>
              <div className={`h-16 w-16 rounded-full ${getFearGreedColor(fearGreed.value)} flex items-center justify-center`}>
                <span className="text-2xl text-white">
                  {fearGreed.value <= 50 ? '😰' : '😎'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full ${getFearGreedColor(fearGreed.value)} transition-all duration-500`}
              style={{ width: `${fearGreed.value}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{t('極度恐懼', 'Extreme Fear')}</span>
            <span>{t('中性', 'Neutral')}</span>
            <span>{t('極度貪婪', 'Extreme Greed')}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總市值', 'Total Market Cap')}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            {formatCurrency(global.total_market_cap_usd, true)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('24h 交易量', '24h Volume')}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            {formatCurrency(global.total_volume_24h_usd, true)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('BTC 佔比', 'BTC Dominance')}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            {formatPercent(global.btc_dominance_pct)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('市場 24h 變化', '24h Market Change')}</p>
          <p
            className={`mt-2 text-lg font-semibold ${
              (global.market_cap_change_24h_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatPercent(global.market_cap_change_24h_pct)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('市場概況', 'Market Overview')}</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('更新時間', 'Updated at')}: {formatDateTime(dashboard.generated_at)}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('交易所數量', 'Exchanges')}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{global.markets ?? '--'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('幣種數量', 'Coins')}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {global.active_cryptocurrencies ?? '--'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('ETH 佔比', 'ETH Dominance')}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {formatPercent(global.eth_dominance_pct)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('趨勢幣種', 'Trending')}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {dashboard.overview.trending.length}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {dashboard.overview.trending.slice(0, 8).map((coin) => (
            <span
              key={coin.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200"
            >
              {coin.symbol.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t('價格列表', 'Prices')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t('幣種', 'Symbol')}</th>
                <th className="px-4 py-3 font-medium">{t('價格', 'Price')}</th>
                <th className="px-4 py-3 font-medium">24h</th>
                <th className="px-4 py-3 font-medium">{t('市值', 'Market Cap')}</th>
                <th className="px-4 py-3 font-medium">{t('24h 成交量', '24h Volume')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dashboard.prices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.symbol.toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(item.price_usd)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      (item.change_24h_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatPercent(item.change_24h_pct)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(item.market_cap, true)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(item.volume_24h, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t('資金費率', 'Funding Rates')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t('幣種', 'Symbol')}</th>
                <th className="px-4 py-3 font-medium">Binance</th>
                <th className="px-4 py-3 font-medium">Bybit</th>
                <th className="px-4 py-3 font-medium">{t('平均', 'Average')}</th>
                <th className="px-4 py-3 font-medium">{t('下次結算', 'Next Funding')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dashboard.funding.map((item) => (
                <tr key={item.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.symbol}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatFundingRate(item.binance)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatFundingRate(item.bybit)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatPercent(item.average_rate, 100, 4)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
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
