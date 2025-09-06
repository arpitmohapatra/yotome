# Yotome RAG Assistant

A production-ready Dual-View RAG (Retrieval-Augmented Generation) application with document management capabilities.

## Features

- **Assistant View**: Chat with an AI assistant grounded in your document knowledge base
- **Document Admin View**: Upload, manage, and delete documents from the knowledge base
- **RAG Pipeline**: LangGraph-powered retrieval with Azure OpenAI embeddings and ChatGPT
- **Vector Store**: ChromaDB for efficient document retrieval
- **Modern UI**: React + Vite with shadcn/ui components and Tailwind CSS v4

## Tech Stack

### Frontend
- React 18 + Vite (SWC)
- shadcn/ui components
- Tailwind CSS v4
- Lucide React icons
- React Query for state management
- Zod for schema validation

### Backend
- FastAPI (Python 3.11+)
- LangChain/LangGraph for RAG orchestration
- ChromaDB vector database
- Azure OpenAI for LLM and embeddings
- Pydantic for data validation

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Azure OpenAI API access

### Environment Setup

1. Copy environment template:
```bash
cp env.example .env
```

2. Configure your Azure OpenAI credentials in `.env`:
   - Set `AZURE_OPENAI_ENDPOINT` to your Azure OpenAI endpoint
   - Set `AZURE_OPENAI_API_KEY` to your API key
   - Adjust other settings as needed

### Option 1: Development Mode (Recommended for testing)

```bash
# Install dependencies
make install

# Start development servers (both backend and frontend)
make dev
```

### Option 2: Docker Deployment

```bash
# Build and start with Docker
make docker-up
```

## Access Points

Once started, you can access:

- **Frontend Application**: http://localhost:5173 (dev) or http://localhost:3000 (docker)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/healthz

## API Endpoints

- `GET /api/healthz` - Health check
- `POST /api/chat` - Chat with RAG assistant
- `GET /api/docs` - List documents
- `POST /api/docs/upload` - Upload documents
- `DELETE /api/docs/{doc_id}` - Delete document
- `GET /api/settings` - Get configuration

## Usage

1. **Upload Documents**: Go to Document Admin view and upload PDF, DOCX, Markdown, or text files
2. **Chat**: Switch to Assistant view and ask questions about your uploaded documents  
3. **Review Sources**: Click on citations to see source snippets and confidence scores

### Testing with Sample Document

A sample document (`sample-document.md`) is included in the project root. You can upload it to test the system:

1. Start the application
2. Go to Document Admin
3. Upload `sample-document.md`
4. Switch to Assistant and ask: "What are the key features of Yotome RAG Assistant?"

## Configuration

See `.env.example` for all available configuration options including:
- Azure OpenAI settings
- Chunking parameters
- Vector store configuration
- File upload limits

## Development

- Backend API docs: http://localhost:8000/docs
- Frontend dev server: http://localhost:5173
- ChromaDB data stored in `./data/chroma`

## License

MIT
