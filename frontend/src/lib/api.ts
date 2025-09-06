import axios from 'axios'
import { z } from 'zod'

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request/Response interceptors
apiClient.interceptors.request.use(
  (config) => {
    // Add auth headers if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Zod schemas for validation
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

export const SourceCitationSchema = z.object({
  doc_id: z.string(),
  filename: z.string(),
  chunk_index: z.number(),
  snippet: z.string(),
  score: z.number(),
  metadata: z.record(z.any()).optional(),
})

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
})

export const ChatResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(SourceCitationSchema),
  usage: TokenUsageSchema.optional(),
  follow_up: z.string().optional(),
})

export const DocumentInfoSchema = z.object({
  doc_id: z.string(),
  filename: z.string(),
  size: z.number(),
  mime_type: z.string(),
  uploaded_at: z.string(),
  chunks: z.number(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
})

export const DocumentListResponseSchema = z.object({
  items: z.array(DocumentInfoSchema),
  total: z.number(),
})

export const UploadResponseSchema = z.object({
  doc_id: z.string(),
  filename: z.string(),
  chunks: z.number(),
  message: z.string(),
})

export const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
  message: z.string(),
})

export const SettingsResponseSchema = z.object({
  max_tokens: z.number(),
  chunk_size: z.number(),
  chunk_overlap: z.number(),
  top_k: z.number(),
  allowed_mime_types: z.array(z.string()),
  max_file_size: z.number(),
})

export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  timestamp: z.string(),
  services: z.record(z.string()),
})

// Type exports
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type SourceCitation = z.infer<typeof SourceCitationSchema>
export type TokenUsage = z.infer<typeof TokenUsageSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>
export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>
export type SettingsResponse = z.infer<typeof SettingsResponseSchema>
export type HealthResponse = z.infer<typeof HealthResponseSchema>

// API functions
export const api = {
  // Health check
  async healthCheck(): Promise<HealthResponse> {
    const response = await apiClient.get('/api/healthz')
    return HealthResponseSchema.parse(response.data)
  },

  // Chat endpoint
  async chat(messages: ChatMessage[], ragOnly: boolean = true): Promise<ChatResponse> {
    const response = await apiClient.post('/api/chat', {
      messages,
      stream: false,
      rag_only: ragOnly,
    })
    return ChatResponseSchema.parse(response.data)
  },

  // Document management
  async listDocuments(): Promise<DocumentListResponse> {
    const response = await apiClient.get('/api/docs')
    return DocumentListResponseSchema.parse(response.data)
  },

  async uploadDocument(file: File, tags?: string[]): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (tags && tags.length > 0) {
      formData.append('tags', tags.join(','))
    }

    const response = await apiClient.post('/api/docs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        // This can be used with a progress callback if needed
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        console.log(`Upload progress: ${percentCompleted}%`)
      },
    })

    return UploadResponseSchema.parse(response.data)
  },

  async deleteDocument(docId: string): Promise<DeleteResponse> {
    const response = await apiClient.delete(`/api/docs/${docId}`)
    return DeleteResponseSchema.parse(response.data)
  },

  // Settings
  async getSettings(): Promise<SettingsResponse> {
    const response = await apiClient.get('/api/settings')
    return SettingsResponseSchema.parse(response.data)
  },
}

// Error handling utility
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const message = error.response?.data?.detail || error.response?.data?.error || error.message
    const code = error.response?.data?.code
    
    return new ApiError(message, status, code)
  }
  
  return new ApiError(error.message || 'An unknown error occurred')
}

// Streaming chat (for future implementation)
export async function* streamChat(
  messages: ChatMessage[],
  ragOnly: boolean = true
): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages,
        stream: true,
        rag_only: ragOnly,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                yield parsed.token
              }
            } catch {
              console.warn('Failed to parse SSE data:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    console.error('Streaming error:', error)
    throw handleApiError(error)
  }
}
