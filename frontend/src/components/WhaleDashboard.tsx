'use client'

import { useCallback, useEffect, useState } from 'react'

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

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
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
  const [summary, setSummary] = useState<WhaleSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api'

      const [summaryRes, txRes] = await Promise.all([
        fetch(`${API_BASE}/whale/summary`),
        fetch(`${API_BASE}/whale/transactions?min_value_usd=10000`),
      ])

      if (!summaryRes.ok || !txRes.ok) {
        throw new Error('Failed to fetch whale data')
      }

      const summaryData = await summaryRes.json()
      const txData = await txRes.json()

      setSummary(summaryData.data)
      setTransactions(txData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading && !summary) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-700">載入鯨魚數據中...</p>
        </div>
      </section>
    )
  }

  if (error && !summary) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <p className="font-semibold text-red-700">{error}</p>
          <button
            onClick={() => void loadData()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            重試
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
        <h1 className="text-3xl font-bold text-slate-900">🐋 Whale Tracker</h1>
        <button
          onClick={() => void loadData()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          重新整理
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          更新失敗: {error}
        </p>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">24h 大額轉賬</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.whale_transactions_24h}</p>
          <p className="text-xs text-slate-400">{summary.large_transactions_100k} 筆 >$100k</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">總流入 (24h)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatEth(summary.total_inflow_eth)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">總流出 (24h)</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{formatEth(summary.total_outflow_eth)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">淨流入</p>
          <p className={`mt-2 text-2xl font-bold ${netFlowColor}`}>
            {netFlowIcon} {formatEth(Math.abs(summary.net_flow_eth))}
          </p>
        </div>
      </div>

      {/* Exchange Flows */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">交易所資金流向</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(summary.exchange_flows).map(([exchange, data]) => {
            const isPositive = data.net_eth >= 0
            return (
              <div
                key={exchange}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <p className="font-medium capitalize text-slate-900">{exchange}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-emerald-600">In: {formatEth(data.inflow_eth)}</p>
                  <p className="text-rose-600">Out: {formatEth(data.outflow_eth)}</p>
                  <p className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Net: {isPositive ? '+' : ''}{formatEth(data.net_eth)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">最近大額轉賬</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">Hash</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Value (ETH)</th>
                <th className="px-4 py-3 font-medium">Value (USD)</th>
                <th className="px-4 py-3 font-medium">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tx.type === 'inflow'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.type === 'inflow' ? '↓ In' : '↑ Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{shortenHash(tx.hash)}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{shortenAddress(tx.from)}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{shortenAddress(tx.to)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{tx.value_eth.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(tx.value_usd)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatTime(tx.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
