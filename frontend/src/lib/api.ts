import { API_BASE_URL } from './config'

export interface MarketPrice {
  id: string
  symbol: string
  price_usd: number | null
  market_cap: number | null
  volume_24h: number | null
  change_24h_pct: number | null
  last_updated_at: number | null
}

export interface TrendingCoin {
  id: string
  name: string
  symbol: string
  market_cap_rank: number | null
  thumb: string | null
  score: number | null
}

export interface GlobalOverview {
  active_cryptocurrencies: number | null
  markets: number | null
  total_market_cap_usd: number | null
  total_volume_24h_usd: number | null
  btc_dominance_pct: number | null
  eth_dominance_pct: number | null
  market_cap_change_24h_pct: number | null
}

export interface FundingSource {
  funding_rate: number | null
  next_funding_time: string | number | null
}

export interface FundingRate {
  symbol: string
  binance: FundingSource | null
  bybit: FundingSource | null
  average_rate: number | null
}

export interface FearGreedIndex {
  value: number
  value_classification: string
  timestamp: number
  time_updated: string
  is_stale?: boolean
  data_source?: string
  fallback_reason?: string
}

export interface FearGreedHistoryItem {
  value: number
  value_classification: string
  timestamp: number
  date: string
}

export interface DashboardData {
  generated_at: string
  prices: MarketPrice[]
  overview: {
    global: GlobalOverview
    trending: TrendingCoin[]
  }
  funding: FundingRate[]
  is_stale?: boolean
  data_source?: string
  stale_reasons?: string[]
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    let detail = ''
    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload?.detail) {
        detail = ` - ${payload.detail}`
      }
    } catch {
      detail = ''
    }
    throw new Error(`API request failed: ${response.status}${detail}`)
  }

  return (await response.json()) as T
}

export async function fetchMarketDashboard(): Promise<DashboardData> {
  const payload = await request<{ data: DashboardData }>('/market/dashboard')
  return payload.data
}

export async function fetchFearGreedIndex(): Promise<FearGreedIndex> {
  const payload = await request<{ data: FearGreedIndex }>('/market/fear-greed')
  return payload.data
}

export async function fetchFearGreedHistory(days: number = 30): Promise<FearGreedHistoryItem[]> {
  const payload = await request<{ data: FearGreedHistoryItem[] }>(
    `/market/fear-greed/history?days=${days}`
  )
  return payload.data
}

