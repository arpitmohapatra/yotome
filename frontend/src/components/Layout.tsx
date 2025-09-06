import React from 'react'
import { Bot, FileText, Moon, Sun, BookOpenCheck } from 'lucide-react'
import { Button } from './ui/button'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { useThemeContext } from '../lib/theme'
import { cn } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
  activeTab: 'assistant' | 'admin'
  onTabChange: (tab: 'assistant' | 'admin') => void
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { theme, setTheme } = useThemeContext()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <BookOpenCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Yotome Assistant
                </h1>
                <p className="text-xs text-muted-foreground">
                  RAG-powered knowledge assistant
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 max-w-md mx-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assistant" className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span>Assistant</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Document Admin</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="w-9 h-9"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Yotome RAG Assistant v1.0.0</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Powered by Azure OpenAI & ChromaDB
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Status indicator component
export function StatusIndicator({ 
  status, 
  label 
}: { 
  status: 'connected' | 'disconnected' | 'loading'
  label?: string 
}) {
  const statusColors = {
    connected: 'bg-primary',
    disconnected: 'bg-destructive',
    loading: 'bg-accent'
  }

  const statusAnimation = {
    connected: 'animate-pulse',
    disconnected: '',
    loading: 'animate-bounce'
  }

  return (
    <div className="flex items-center space-x-2">
      <div 
        className={cn(
          'w-2 h-2 rounded-full',
          statusColors[status],
          statusAnimation[status]
        )}
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

// Loading spinner component
export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('animate-spin rounded-full border-2 border-primary border-t-transparent', sizeClasses[size])} />
  )
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
