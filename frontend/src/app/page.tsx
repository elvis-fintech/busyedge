'use client'

import { useState } from 'react'
import { ThemeProvider } from '../components/ThemeProvider'
import { LocaleProvider } from '../components/LocaleProvider'
import Sidebar from '../components/Sidebar'
import MarketDashboard from '../components/MarketDashboard'
import WhaleDashboard from '../components/WhaleDashboard'
import SentimentDashboard from '../components/SentimentDashboard'
import AISignalsDashboard from '../components/AISignalsDashboard'
import PortfolioDashboard from '../components/PortfolioDashboard'
import AlertsDashboard from '../components/AlertsDashboard'

type Tab = 'market' | 'whale' | 'sentiment' | 'ai' | 'portfolio' | 'alerts'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<Tab>('market')

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content - with left padding for sidebar */}
      <div className="lg:pl-64">
        <div className="py-6 lg:py-8">
          {activeTab === 'market' && <MarketDashboard />}
          {activeTab === 'whale' && <WhaleDashboard />}
          {activeTab === 'sentiment' && <SentimentDashboard />}
          {activeTab === 'ai' && <AISignalsDashboard />}
          {activeTab === 'portfolio' && <PortfolioDashboard />}
          {activeTab === 'alerts' && <AlertsDashboard />}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <DashboardContent />
      </LocaleProvider>
    </ThemeProvider>
  )
}
