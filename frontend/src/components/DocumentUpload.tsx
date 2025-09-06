import React, { useState, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { LoadingSpinner } from './Layout'
import { api, handleApiError } from '../lib/api'
import { cn, formatFileSize, getMimeTypeIcon } from '../lib/utils'

interface DocumentUploadProps {
  onUploadComplete?: () => void
  className?: string
}

interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  success: string | null
  tags: string
}

export function DocumentUpload({ onUploadComplete, className }: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    success: null,
    tags: ''
  })

  const [dragActive, setDragActive] = useState(false)

  const resetUploadState = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      success: null,
      tags: ''
    })
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (file: File) => {
    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      success: null
    }))
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null,
      success: null
    }))

    try {
      const tags = uploadState.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const response = await api.uploadDocument(uploadState.file, tags)

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        success: `Successfully uploaded "${response.filename}" with ${response.chunks} chunks`
      }))

      // Reset after a delay
      setTimeout(() => {
        resetUploadState()
        onUploadComplete?.()
      }, 2000)

    } catch (error) {
      const apiError = handleApiError(error)
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: apiError.message
      }))
    }
  }

  const removeFile = () => {
    setUploadState(prev => ({
      ...prev,
      file: null,
      error: null,
      success: null
    }))
  }

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </CardTitle>
        <CardDescription>
          Add documents to your knowledge base. Supports PDF, DOCX, TXT, MD, and HTML files.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!uploadState.file && (
          <div
            className={cn(
              'upload-area border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              dragActive ? 'drag-over' : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="flex flex-col items-center space-y-3">
              <Upload className={cn(
                'w-12 h-12',
                dragActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <div>
                <p className="text-lg font-medium">
                  {dragActive ? 'Drop file here' : 'Choose file or drag & drop'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOCX, TXT, MD, HTML (max 50MB)
                </p>
              </div>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
            
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept={allowedTypes.join(',')}
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Selected File */}
        {uploadState.file && (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getMimeTypeIcon(uploadState.file.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {uploadState.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadState.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    disabled={uploadState.uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tags Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tags (optional)
              </label>
              <Input
                placeholder="tag1, tag2, tag3"
                value={uploadState.tags}
                onChange={(e) => setUploadState(prev => ({ ...prev, tags: e.target.value }))}
                disabled={uploadState.uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {uploadState.file && (
          <Button
            onClick={handleUpload}
            disabled={uploadState.uploading}
            className="w-full"
          >
            {uploadState.uploading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </div>
            )}
          </Button>
        )}

        {/* Status Messages */}
        {uploadState.error && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{uploadState.error}</p>
          </div>
        )}

        {uploadState.success && (
          <div className="flex items-center space-x-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <CheckCircle className="w-4 h-4 text-primary" />
            <p className="text-sm text-primary">{uploadState.success}</p>
          </div>
        )}

        {/* Allowed File Types */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Supported File Types</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span>📄</span>
              <span>PDF Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📝</span>
              <span>Word Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📝</span>
              <span>Text Files</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📝</span>
              <span>Markdown Files</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🌐</span>
              <span>HTML Files</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
