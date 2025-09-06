import React, { useState } from 'react'
import { DocumentUpload } from '../components/DocumentUpload'
import { DocumentList } from '../components/DocumentList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { FileText, Upload, Database, Settings } from 'lucide-react'

export function AdminPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = () => {
    // Trigger a refresh of the document list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Upload Section */}
      <div className="xl:col-span-1 space-y-6">
        <DocumentUpload 
          onUploadComplete={handleUploadComplete}
        />

        {/* Admin Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Admin Tools</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Document management and knowledge base administration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Bulk Upload Support</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Vector Store Management</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Document Processing</span>
            </div>
          </CardContent>
        </Card>

        {/* Processing Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Processing Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">1. Document Upload</h4>
              <p className="text-xs text-muted-foreground">
                Files are validated and temporarily stored for processing
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">2. Text Extraction</h4>
              <p className="text-xs text-muted-foreground">
                Content is extracted using format-specific parsers
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">3. Chunking</h4>
              <p className="text-xs text-muted-foreground">
                Text is split into semantic chunks for better retrieval
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">4. Embedding</h4>
              <p className="text-xs text-muted-foreground">
                Azure OpenAI generates vector embeddings for each chunk
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">5. Storage</h4>
              <p className="text-xs text-muted-foreground">
                Vectors and metadata are stored in ChromaDB
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document List Section */}
      <div className="xl:col-span-2">
        <DocumentList 
          refreshTrigger={refreshTrigger}
          className="h-full"
        />
      </div>
    </div>
  )
}
