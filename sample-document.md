# Yotome RAG Assistant - User Guide

## Overview

Yotome RAG Assistant is a powerful knowledge management system that allows you to upload documents and ask questions about their content. The system uses advanced AI techniques to understand your documents and provide accurate, grounded answers.

## Key Features

### Document Upload
- Support for multiple file formats: PDF, DOCX, TXT, MD, HTML
- Automatic text extraction and chunking
- Vector embeddings for semantic search
- Tag-based organization

### Intelligent Chat
- Natural language queries
- Grounded responses with source citations
- Conversation context awareness
- Real-time streaming responses

### Document Management
- Upload and delete documents
- View document statistics
- Search and filter capabilities
- Tag management

## Getting Started

1. **Upload Documents**: Go to the Document Admin tab and upload your files
2. **Ask Questions**: Switch to the Assistant tab and start asking questions
3. **Review Sources**: Click on citations to see the source material

## Best Practices

### Asking Questions
- Be specific in your queries
- Reference document names when relevant
- Ask follow-up questions for clarification

### Document Organization
- Use descriptive filenames
- Add relevant tags during upload
- Keep documents focused and well-structured

## Technical Details

### RAG Pipeline
The system uses a sophisticated Retrieval-Augmented Generation pipeline:

1. **Document Processing**: Text extraction and semantic chunking
2. **Vectorization**: Azure OpenAI embeddings for semantic similarity
3. **Storage**: ChromaDB vector database for efficient retrieval
4. **Retrieval**: Semantic search with MMR (Maximal Marginal Relevance)
5. **Generation**: Azure OpenAI GPT models for answer synthesis

### Architecture
- **Frontend**: React + Vite with Tailwind CSS
- **Backend**: FastAPI with LangGraph orchestration
- **Vector Store**: ChromaDB with persistent storage
- **AI Services**: Azure OpenAI for embeddings and chat completion

## Troubleshooting

### Common Issues

**Upload Fails**
- Check file size (max 50MB)
- Verify file format is supported
- Ensure stable internet connection

**No Answers Found**
- Try rephrasing your question
- Upload more relevant documents
- Check if documents contain the information you're looking for

**Poor Answer Quality**
- Ensure documents are well-structured
- Add more context to your questions
- Try asking more specific questions

## Support

For technical support or feature requests, please contact the development team or check the project documentation.

---

*This document serves as both a user guide and a sample document for testing the RAG system.*
