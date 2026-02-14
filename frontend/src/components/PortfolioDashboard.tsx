'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../lib/config'
import { useLocale } from './LocaleProvider'

interface PortfolioPosition {
  coin: string
  quantity: number
  avg_cost_usd: number
  current_price_usd: number
  cost_basis_usd: number
  market_value_usd: number
  pnl_usd: number
  pnl_pct: number
  allocation_pct: number
}

interface PortfolioSummary {
  total_positions: number
  total_cost_usd: number
  total_value_usd: number
  total_pnl_usd: number
  total_pnl_pct: number
}

interface PortfolioPayload {
  positions: PortfolioPosition[]
  summary: PortfolioSummary
  data_source?: string
  is_mock?: boolean
  updated_at: string
}

function hasChineseText(value: string): boolean {
  return /[\u4E00-\u9FFF]/.test(value)
}

function formatCurrency(value: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export default function PortfolioDashboard() {
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)
  const localeCode = locale === 'en' ? 'en-US' : 'zh-HK'

  const [portfolio, setPortfolio] = useState<PortfolioPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadPortfolio = useCallback(async () => {
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`, { cache: 'no-store' })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { detail?: string }
        const defaultMessage = locale === 'en' ? `Failed to load portfolio: ${res.status}` : `載入投資組合失敗: ${res.status}`
        const detail = payload.detail
        if (!detail) {
          throw new Error(defaultMessage)
        }
        if (locale === 'en' && hasChineseText(detail)) {
          throw new Error(`Portfolio data unavailable. Please configure PORTFOLIO_POSITIONS_JSON.`)
        }
        throw new Error(detail)
      }

      const data = (await res.json()) as { data: PortfolioPayload }
      setPortfolio(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === 'en' ? 'Failed to load data' : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  const bestPosition = useMemo(() => {
    if (!portfolio?.positions.length) return null
    return [...portfolio.positions].sort((a, b) => b.pnl_pct - a.pnl_pct)[0]
  }, [portfolio])

  const worstPosition = useMemo(() => {
    if (!portfolio?.positions.length) return null
    return [...portfolio.positions].sort((a, b) => a.pnl_pct - b.pnl_pct)[0]
  }, [portfolio])

  if (loading && !portfolio) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </section>
    )
  }

  if (error && !portfolio) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:border-red-800 dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadPortfolio()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('重試', 'Retry')}
          </button>
        </div>
      </section>
    )
  }

  if (!portfolio) return null

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">💼 {t('投資組合追蹤', 'Portfolio Tracker')}</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('更新', 'Updated')}: {lastUpdated.toLocaleTimeString(localeCode)}
            </span>
          )}
          <button
            onClick={() => void loadPortfolio()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('重新整理', 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          {t('更新失敗', 'Update failed')}: {error}
        </p>
      )}

      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
        {t('資料來源', 'Data source')}: {portfolio.data_source ?? '--'} · {t('狀態', 'Status')}:{' '}
        {portfolio.is_mock ? t('模擬資料', 'Mock data') : t('即時資料', 'Live data')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總資產市值', 'Total Value')}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(portfolio.summary.total_value_usd)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總成本', 'Total Cost')}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(portfolio.summary.total_cost_usd)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總損益 (P&L)', 'Total P&L')}</p>
          <p
            className={`mt-2 text-xl font-semibold ${
              portfolio.summary.total_pnl_usd >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(portfolio.summary.total_pnl_usd)} ({formatPercent(portfolio.summary.total_pnl_pct)})
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('持倉數量', 'Positions')}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{portfolio.summary.total_positions}</p>
        </div>
      </div>

      {(bestPosition || worstPosition) && (
        <div className="grid gap-4 md:grid-cols-2">
          {bestPosition && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{t('最佳表現', 'Best Performer')}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                {bestPosition.coin} +{formatPercent(bestPosition.pnl_pct)}
              </p>
            </div>
          )}
          {worstPosition && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-700 dark:bg-rose-900/20">
              <p className="text-sm text-rose-700 dark:text-rose-300">{t('最弱表現', 'Worst Performer')}</p>
              <p className="mt-1 text-lg font-semibold text-rose-800 dark:text-rose-200">
                {worstPosition.coin} {formatPercent(worstPosition.pnl_pct)}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('持倉明細', 'Positions')}</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('來源更新', 'Source updated')}: {new Date(portfolio.updated_at).toLocaleString(localeCode)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t('幣種', 'Coin')}</th>
                <th className="px-4 py-3 font-medium">{t('數量', 'Quantity')}</th>
                <th className="px-4 py-3 font-medium">{t('平均成本', 'Avg Cost')}</th>
                <th className="px-4 py-3 font-medium">{t('現價', 'Current Price')}</th>
                <th className="px-4 py-3 font-medium">{t('總成本', 'Cost Basis')}</th>
                <th className="px-4 py-3 font-medium">{t('市值', 'Market Value')}</th>
                <th className="px-4 py-3 font-medium">{t('損益', 'P&L')}</th>
                <th className="px-4 py-3 font-medium">{t('配置比例', 'Allocation')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {portfolio.positions.map((position) => (
                <tr key={position.coin} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{position.coin}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{position.quantity.toLocaleString(localeCode)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(position.avg_cost_usd)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(position.current_price_usd)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(position.cost_basis_usd)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(position.market_value_usd)}</td>
                  <td className={`px-4 py-3 font-medium ${position.pnl_usd >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(position.pnl_usd)} ({formatPercent(position.pnl_pct)})
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatPercent(position.allocation_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
