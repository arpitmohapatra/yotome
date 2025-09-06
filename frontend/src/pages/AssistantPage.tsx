import React from 'react'
import { Chat } from '../components/Chat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Bot, BookOpenCheck, MessageSquare, Search } from 'lucide-react'

export function AssistantPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Main Chat Area */}
      <div className="lg:col-span-3">
        <Card className="h-[calc(100vh-200px)]">
          <Chat />
        </Card>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        {/* Quick Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Assistant Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <BookOpenCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Knowledge Base Grounded</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Semantic Search Powered</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Context Aware</span>
            </div>
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Usage Tips</CardTitle>
            <CardDescription className="text-sm">
              Get the most out of your assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ask specific questions</h4>
              <p className="text-xs text-muted-foreground">
                "What are the key findings in the Q3 report?" works better than "Tell me about Q3"
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Reference documents</h4>
              <p className="text-xs text-muted-foreground">
                "According to the user manual, how do I..." helps me find the right context
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Follow up questions</h4>
              <p className="text-xs text-muted-foreground">
                Ask for clarification or more details to get comprehensive answers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
