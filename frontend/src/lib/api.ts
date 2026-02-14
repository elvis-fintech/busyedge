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

export interface DashboardData {
  generated_at: string
  prices: MarketPrice[]
  overview: {
    global: GlobalOverview
    trending: TrendingCoin[]
  }
  funding: FundingRate[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchMarketDashboard(): Promise<DashboardData> {
  const payload = await request<{ data: DashboardData }>('/market/dashboard')
  return payload.data
}

