import React, { useState, useEffect } from 'react'
import { Search, Trash2, FileText, Calendar, Hash, Tag, MoreVertical, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { LoadingSpinner } from './Layout'
import { api, handleApiError, DocumentInfo } from '../lib/api'
import { cn, formatFileSize, formatDate, getMimeTypeIcon, debounce } from '../lib/utils'

interface DocumentListProps {
  refreshTrigger?: number
  className?: string
}

export function DocumentList({ refreshTrigger, className }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Debounced search function
  const debouncedSearch = debounce((query: string) => {
    filterDocuments(query, selectedTag)
  }, 300)

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.listDocuments()
      setDocuments(response.items)
      setFilteredDocuments(response.items)
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter documents based on search and tag
  const filterDocuments = (query: string, tag: string) => {
    let filtered = documents

    if (query) {
      const lowercaseQuery = query.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.filename.toLowerCase().includes(lowercaseQuery) ||
        doc.tags.some(t => t.toLowerCase().includes(lowercaseQuery))
      )
    }

    if (tag) {
      filtered = filtered.filter(doc => doc.tags.includes(tag))
    }

    setFilteredDocuments(filtered)
  }

  // Delete document
  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId)
      setDocuments(prev => prev.filter(doc => doc.doc_id !== docId))
      setFilteredDocuments(prev => prev.filter(doc => doc.doc_id !== docId))
      setDeleteConfirm(null)
    } catch (err) {
      const apiError = handleApiError(err)
      setError(apiError.message)
    }
  }

  // Get all unique tags
  const getAllTags = () => {
    const tagSet = new Set<string>()
    documents.forEach(doc => {
      doc.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  // Effects
  useEffect(() => {
    loadDocuments()
  }, [refreshTrigger])

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, selectedTag, documents])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <LoadingSpinner />
            <span>Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={loadDocuments}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const allTags = getAllTags()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Document Library</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({filteredDocuments.length} of {documents.length})
          </span>
        </CardTitle>
        <CardDescription>
          Manage your knowledge base documents
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {allTags.length > 0 && (
            <div className="min-w-[150px]">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Document Stats */}
        {documents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {documents.length}
              </div>
              <div className="text-xs text-muted-foreground">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {documents.reduce((sum, doc) => sum + doc.chunks, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {allTags.length}
              </div>
              <div className="text-xs text-muted-foreground">Tags</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
              </div>
              <div className="text-xs text-muted-foreground">Total Size</div>
            </div>
          </div>
        )}

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {documents.length === 0 
                ? "No documents uploaded yet" 
                : "No documents match your search"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.doc_id}
                document={doc}
                onDelete={() => setDeleteConfirm(doc.doc_id)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span>Confirm Deletion</span>
                </CardTitle>
                <CardDescription>
                  Are you sure you want to delete this document? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const doc = documents.find(d => d.doc_id === deleteConfirm)
                  return doc ? (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMimeTypeIcon(doc.mime_type)}</span>
                        <div>
                          <p className="font-medium text-sm">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.chunks} chunks • {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Document Card Component
function DocumentCard({ 
  document, 
  onDelete 
}: { 
  document: DocumentInfo
  onDelete: () => void 
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">
              {getMimeTypeIcon(document.mime_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {document.filename}
              </h3>
              
              <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(document.uploaded_at)}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Hash className="w-3 h-3" />
                  <span>{document.chunks} chunks</span>
                </div>
                
                <span>{formatFileSize(document.size)}</span>
              </div>

              {document.tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {document.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
