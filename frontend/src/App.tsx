import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './lib/theme.tsx'
import { Layout, ErrorBoundary } from './components/Layout'
import { AssistantPage } from './pages/AssistantPage'
import { AdminPage } from './pages/AdminPage'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'admin'>('assistant')

  const handleTabChange = (tab: 'assistant' | 'admin') => {
    setActiveTab(tab)
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="yotome-ui-theme">
          <Layout activeTab={activeTab} onTabChange={handleTabChange}>
            <ErrorBoundary>
              {activeTab === 'assistant' ? (
                <AssistantPage />
              ) : (
                <AdminPage />
              )}
            </ErrorBoundary>
          </Layout>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
