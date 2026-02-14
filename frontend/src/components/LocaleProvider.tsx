'use client'

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'zh-HK' | 'en'

interface LocaleContextType {
  locale: Locale
  toggleLocale: () => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh-HK')

  useEffect(() => {
    const stored = localStorage.getItem('busyedge-locale') as Locale | null
    if (stored === 'zh-HK' || stored === 'en') {
      setLocale(stored)
      return
    }

    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('en')) {
      setLocale('en')
    } else {
      setLocale('zh-HK')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('busyedge-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      toggleLocale: () => setLocale((prev) => (prev === 'zh-HK' ? 'en' : 'zh-HK')),
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
