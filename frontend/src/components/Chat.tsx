import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader } from './ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { LoadingSpinner } from './Layout'
import { ChatMessage, SourceCitation, api, handleApiError } from '../lib/api'
import { cn, scrollToBottom, copyToClipboard, formatDate, truncateText } from '../lib/utils'

interface ChatProps {
  className?: string
}

export function Chat({ className }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ragOnly, setRagOnly] = useState(true)
  const [sources, setSources] = useState<{ [messageId: string]: SourceCitation[] }>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      scrollToBottom(messagesEndRef.current.parentElement as HTMLElement)
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.chat(newMessages, ragOnly)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer
      }

      const finalMessages = [...newMessages, assistantMessage]
      setMessages(finalMessages)

      // Store sources for this message
      if (response.sources.length > 0) {
        const messageId = `assistant-${finalMessages.length - 1}`
        setSources(prev => ({
          ...prev,
          [messageId]: response.sources
        }))
      }

    } catch (error) {
      const apiError = handleApiError(error)
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${apiError.message}. Please try again.`
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as React.KeyboardEvent<HTMLTextAreaElement>)
    }
  }

  const clearChat = () => {
    setMessages([])
    setSources({})
  }

  const copyMessage = async (content: string) => {
    const success = await copyToClipboard(content)
    if (success) {
      // You could add a toast notification here
      console.log('Message copied to clipboard')
    }
  }

  return (
    <div className={cn('flex flex-col h-full max-h-[calc(100vh-200px)]', className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Chat Assistant</h2>
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              ragOnly ? 'bg-primary' : 'bg-accent'
            )} />
            <span className="text-xs text-muted-foreground">
              {ragOnly ? 'KB Grounded' : 'General'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRagOnly(!ragOnly)}
            className="text-xs"
          >
            {ragOnly ? 'RAG Only' : 'General'}
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="w-12 h-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Welcome to Yotome Assistant
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me anything about your uploaded documents. I'll provide answers grounded in your knowledge base.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 max-w-md">
              {[
                "What documents do I have?",
                "Summarize the main topics",
                "Find information about...",
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs hover:bg-primary/10 hover:border-primary/50 dark:border-border/80 dark:bg-card/40 dark:hover:bg-primary/20 dark:hover:border-primary/60 transition-all duration-200"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              sources={sources[`assistant-${index}`]}
              onCopy={() => copyMessage(message.content)}
            />
          ))
        )}

        {isLoading && (
          <div className="flex items-start space-x-3 animate-slide-in">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-muted-foreground typing-indicator">
                      Thinking...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-card/30">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your documents... (Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] max-h-[120px] pr-12 resize-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {ragOnly ? 'Answers will be grounded in your knowledge base' : 'General AI assistance enabled'}
            </span>
            <span>{input.length}/2000</span>
          </div>
        </form>
      </div>
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ 
  message, 
  sources, 
  onCopy 
}: { 
  message: ChatMessage
  sources?: SourceCitation[]
  onCopy: () => void 
}) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn(
      'flex items-start space-x-3 message-enter group',
      isUser ? 'flex-row-reverse space-x-reverse' : ''
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-1',
        isUser ? 'bg-secondary' : 'bg-primary'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex flex-col space-y-2 min-w-0',
        isUser ? 'max-w-[80%] items-end' : 'max-w-[85%] items-start'
      )}>
        <Card className={cn(
          'w-fit min-w-[60px] max-w-full shadow-sm py-0',
          isUser 
            ? 'bg-primary text-primary-foreground border-primary/20' 
            : 'bg-card/80 backdrop-blur-sm border-border/60 dark:border-border/80 dark:bg-card/60'
        )}>
          <CardContent className="px-3 py-1.5">
            <div className="text-sm leading-relaxed">
              <MessageContent content={message.content} />
            </div>
          </CardContent>
        </Card>

        {/* Sources Accordion */}
        {isAssistant && sources && sources.length > 0 && (
          <SourcesAccordion sources={sources} />
        )}

        {/* Message Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-6 px-2 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <span className="text-xs text-muted-foreground">
            {formatDate(new Date())}
          </span>
        </div>
      </div>
    </div>
  )
}

// Message Content Component
function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for citations
  const renderContent = (text: string) => {
    // Replace citations with highlighted spans
    const citationRegex = /\[([^\]]+)#(\d+)\]/g
    const parts = text.split(citationRegex)
    
    return parts.map((part, index) => {
      if (index % 3 === 1) {
        // This is a filename
        const chunkIndex = parts[index + 1]
        return (
          <span
            key={index}
            className="inline-flex items-center px-1 py-0.5 text-xs bg-primary/20 text-primary rounded border cursor-pointer hover:bg-primary/30 transition-colors"
            title={`Source: ${part}, Chunk: ${chunkIndex}`}
          >
            [{part}#{chunkIndex}]
          </span>
        )
      } else if (index % 3 === 2) {
        // This is a chunk index, skip it as it's handled above
        return null
      } else {
        // Regular text
        return <span key={index}>{part}</span>
      }
    })
  }

  return <div className="whitespace-pre-wrap break-words min-h-fit">{renderContent(content)}</div>
}

// Sources Accordion Component
function SourcesAccordion({ sources }: { sources: SourceCitation[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="sources" className="border border-border/50 rounded-lg">
        <AccordionTrigger className="px-4 py-2 hover:no-underline">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">
              Sources ({sources.length})
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-3">
            {sources.map((source, index) => (
              <SourceCard key={index} source={source} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

// Source Card Component
function SourceCard({ source }: { source: SourceCitation }) {
  const confidenceColor = source.score > 0.8 ? 'text-primary' : 
                          source.score > 0.6 ? 'text-accent-foreground' : 'text-destructive'

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium truncate">
              {source.filename}
            </div>
            <div className="text-xs text-muted-foreground">
              #{source.chunk_index}
            </div>
          </div>
          <div className={cn('text-xs font-medium', confidenceColor)}>
            {(source.score * 100).toFixed(0)}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          {truncateText(source.snippet, 150)}
        </p>
      </CardContent>
    </Card>
  )
}
