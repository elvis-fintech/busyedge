'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/config'
import { useLocale } from './LocaleProvider'

interface WhaleSummary {
  whale_transactions_24h: number
  large_transactions_100k: number
  total_inflow_eth: number
  total_outflow_eth: number
  net_flow_eth: number
  exchange_flows: {
    [key: string]: {
      inflow_eth: number
      outflow_eth: number
      net_eth: number
    }
  }
  data_source?: string
  is_mock?: boolean
  updated_at?: string
}

interface Transaction {
  hash: string
  from: string
  to: string
  value_eth: number
  value_usd: number
  timestamp: number
  type: 'inflow' | 'outflow'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatEth(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value) + ' ETH'
}

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function shortenHash(hash: string): string {
  if (hash.length <= 14) return hash
  return hash.slice(0, 10) + '...' + hash.slice(-6)
}

export default function WhaleDashboard() {
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)
  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString(locale === 'en' ? 'en-US' : 'zh-HK')

  const [summary, setSummary] = useState<WhaleSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(60)

  const loadData = useCallback(async () => {
    setError(null)

    try {
      const [summaryRes, txRes] = await Promise.all([
        fetch(`${API_BASE_URL}/whale/summary`),
        fetch(`${API_BASE_URL}/whale/transactions?min_value_usd=10000`),
      ])

      if (!summaryRes.ok || !txRes.ok) {
        throw new Error(locale === 'en' ? 'Failed to load whale data' : '載入巨鯨資料失敗')
      }

      const summaryData = await summaryRes.json()
      const txData = await txRes.json()

      setSummary(summaryData.data)
      setTransactions(txData.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === 'en' ? 'Failed to load data' : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return
    
    const interval = setInterval(() => {
      void loadData()
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [refreshInterval, loadData])

  if (loading && !summary) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </section>
    )
  }

  if (error && !summary) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadData()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('重試', 'Retry')}
          </button>
        </div>
      </section>
    )
  }

  if (!summary) return null

  const netFlowColor = summary.net_flow_eth >= 0 ? 'text-emerald-600' : 'text-rose-600'
  const netFlowIcon = summary.net_flow_eth >= 0 ? '↑' : '↓'

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">🐋 {t('巨鯨追蹤', 'Whale Tracker')}</h1>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('更新', 'Updated')}: {lastUpdated.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-HK')}
            </span>
          )}
          
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
            onClick={() => void loadData()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('重新整理', 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {t('更新失敗', 'Update failed')}: {error}
        </p>
      )}

      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
        {t('資料來源', 'Data source')}: {summary.data_source ?? 'blockchair'} · {t('狀態', 'Status')}:{' '}
        {summary.is_mock ? t('模擬資料', 'Mock data') : t('即時資料', 'Live data')}
      </p>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('24h 大額轉賬', 'Large Transfers (24h)')}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{summary.whale_transactions_24h}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {summary.large_transactions_100k}{locale === 'en' ? '' : '筆'} &gt;$100k
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總流入 (24h)', 'Total Inflow (24h)')}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatEth(summary.total_inflow_eth)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('總流出 (24h)', 'Total Outflow (24h)')}</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{formatEth(summary.total_outflow_eth)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('淨流入', 'Net Flow')}</p>
          <p className={`mt-2 text-2xl font-bold ${netFlowColor}`}>
            {netFlowIcon} {formatEth(Math.abs(summary.net_flow_eth))}
          </p>
        </div>
      </div>

      {/* Exchange Flows */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t('交易所資金流向', 'Exchange Flows')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(summary.exchange_flows).map(([exchange, data]) => {
            const isPositive = data.net_eth >= 0
            return (
              <div
                key={exchange}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/40"
              >
                <p className="font-medium capitalize text-slate-900 dark:text-white">{exchange}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-emerald-600">{t('流入', 'In')}: {formatEth(data.inflow_eth)}</p>
                  <p className="text-rose-600">{t('流出', 'Out')}: {formatEth(data.outflow_eth)}</p>
                  <p className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t('淨流向', 'Net')}: {isPositive ? '+' : ''}{formatEth(data.net_eth)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t('最近大額轉賬', 'Recent Large Transfers')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t('類型', 'Type')}</th>
                <th className="px-4 py-3 font-medium">{t('交易雜湊', 'Hash')}</th>
                <th className="px-4 py-3 font-medium">{t('來源地址', 'From')}</th>
                <th className="px-4 py-3 font-medium">{t('目標地址', 'To')}</th>
                <th className="px-4 py-3 font-medium">{t('金額 (ETH)', 'Value (ETH)')}</th>
                <th className="px-4 py-3 font-medium">{t('金額 (USD)', 'Value (USD)')}</th>
                <th className="px-4 py-3 font-medium">{t('時間', 'Time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tx.type === 'inflow'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}
                    >
                      {tx.type === 'inflow' ? t('↓ 流入', '↓ In') : t('↑ 流出', '↑ Out')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{shortenHash(tx.hash)}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{shortenAddress(tx.from)}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{shortenAddress(tx.to)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{tx.value_eth.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(tx.value_usd)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatTime(tx.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
