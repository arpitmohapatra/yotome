"""LangGraph implementation for RAG workflow."""

import logging
from typing import Dict, Any, List, Optional
import json
from openai import AzureOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .settings import settings
from .models import RAGContext, RAGResponse, RetrievedChunk, TokenUsage, ChatMessage
from .retriever import vector_store
from .prompts import (
    build_rag_prompt,
    ROUTER_PROMPT,
    GUARDRAILS_PROMPT,
    format_chunks_for_prompt
)

logger = logging.getLogger(__name__)


class RAGState(Dict[str, Any]):
    """State for the RAG graph."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Initialize required keys
        self.setdefault("query", "")
        self.setdefault("conversation_history", [])
        self.setdefault("rag_only", True)
        self.setdefault("retrieved_chunks", [])
        self.setdefault("answer", "")
        self.setdefault("citations", [])
        self.setdefault("confidence", 0.0)
        self.setdefault("follow_up", None)
        self.setdefault("usage", None)
        self.setdefault("route_decision", "")
        self.setdefault("error", None)


class RAGGraph:
    """LangGraph-based RAG implementation."""
    
    def __init__(self):
        self.openai_client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint
        )
        self.graph = self._build_graph()
    
    def _build_graph(self) -> CompiledStateGraph:
        """Build the RAG workflow graph."""
        workflow = StateGraph(RAGState)
        
        # Add nodes
        workflow.add_node("router", self._router_node)
        workflow.add_node("retrieve", self._retrieve_node)
        workflow.add_node("grounded_answer", self._grounded_answer_node)
        workflow.add_node("guardrails", self._guardrails_node)
        workflow.add_node("finalize", self._finalize_node)
        workflow.add_node("handle_error", self._handle_error_node)
        
        # Set entry point
        workflow.set_entry_point("router")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "router",
            self._route_decision,
            {
                "retrieve": "retrieve",
                "error": "handle_error",
                "clarify": "finalize"
            }
        )
        
        workflow.add_edge("retrieve", "grounded_answer")
        workflow.add_edge("grounded_answer", "guardrails")
        workflow.add_edge("guardrails", "finalize")
        workflow.add_edge("finalize", END)
        workflow.add_edge("handle_error", END)
        
        return workflow.compile()
    
    def _router_node(self, state: RAGState) -> RAGState:
        """Route the query to appropriate handling."""
        try:
            query = state["query"]
            rag_only = state["rag_only"]
            
            # Simple routing logic
            if not query.strip():
                state["route_decision"] = "error"
                state["error"] = "Empty query provided"
                return state
            
            # Check if query is too short or vague
            if len(query.strip().split()) < 2:
                state["route_decision"] = "clarify"
                state["follow_up"] = "Could you please provide more details about what you're looking for?"
                return state
            
            # For now, always route to retrieve for knowledge questions
            state["route_decision"] = "retrieve"
            
            logger.debug(f"Router decision: {state['route_decision']}")
            return state
            
        except Exception as e:
            logger.error(f"Router node error: {e}")
            state["route_decision"] = "error"
            state["error"] = f"Router error: {str(e)}"
            return state
    
    def _route_decision(self, state: RAGState) -> str:
        """Determine the next step based on router decision."""
        return state.get("route_decision", "error")
    
    def _retrieve_node(self, state: RAGState) -> RAGState:
        """Retrieve relevant chunks from the vector store."""
        try:
            query = state["query"]
            
            # Search the vector store
            retrieved_chunks = vector_store.search(
                query=query,
                top_k=settings.top_k
            )
            
            # Convert to dict format for state
            chunks_data = []
            for chunk in retrieved_chunks:
                chunk_dict = {
                    "doc_id": chunk.doc_id,
                    "filename": chunk.filename,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "score": chunk.score,
                    "metadata": chunk.metadata
                }
                chunks_data.append(chunk_dict)
            
            state["retrieved_chunks"] = chunks_data
            
            logger.debug(f"Retrieved {len(chunks_data)} chunks")
            return state
            
        except Exception as e:
            logger.error(f"Retrieve node error: {e}")
            state["error"] = f"Retrieval error: {str(e)}"
            return state
    
    def _grounded_answer_node(self, state: RAGState) -> RAGState:
        """Generate grounded answer from retrieved chunks."""
        try:
            query = state["query"]
            chunks = state["retrieved_chunks"]
            conversation_history = state.get("conversation_history", [])
            
            if not chunks:
                state["answer"] = "I don't have enough information in my knowledge base to answer your question. You might want to upload relevant documents or ask about something else."
                state["confidence"] = 0.0
                return state
            
            # Build the prompt
            prompt = build_rag_prompt(
                query=query,
                chunks=chunks,
                conversation_history=conversation_history,
                rag_only=state["rag_only"]
            )
            
            # Generate response
            response = self.openai_client.chat.completions.create(
                model=settings.azure_openai_deployment,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Answer this question: {query}"}
                ],
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
            
            answer = response.choices[0].message.content
            usage_data = response.usage
            
            # Extract citations from the answer
            citations = self._extract_citations(answer, chunks)
            
            # Calculate confidence based on chunk scores and answer quality
            confidence = self._calculate_confidence(chunks, answer)
            
            state["answer"] = answer
            state["citations"] = citations
            state["confidence"] = confidence
            
            if usage_data:
                state["usage"] = {
                    "prompt_tokens": usage_data.prompt_tokens,
                    "completion_tokens": usage_data.completion_tokens,
                    "total_tokens": usage_data.total_tokens
                }
            
            logger.debug(f"Generated answer with confidence: {confidence}")
            return state
            
        except Exception as e:
            logger.error(f"Grounded answer node error: {e}")
            state["error"] = f"Answer generation error: {str(e)}"
            return state
    
    def _guardrails_node(self, state: RAGState) -> RAGState:
        """Apply guardrails to the generated answer."""
        try:
            answer = state["answer"]
            
            if not answer or state.get("error"):
                return state
            
            # Simple guardrails checks
            # Check for potential hallucinations (claims without citations)
            if "[" not in answer and state["retrieved_chunks"]:
                logger.warning("Answer lacks citations despite having retrieved chunks")
                state["follow_up"] = "I found relevant information but couldn't properly cite the sources. Could you rephrase your question?"
            
            # Check confidence threshold
            if state["confidence"] < 0.3:
                state["follow_up"] = "I'm not very confident in this answer. Could you provide more specific details or upload additional relevant documents?"
            
            return state
            
        except Exception as e:
            logger.error(f"Guardrails node error: {e}")
            state["error"] = f"Guardrails error: {str(e)}"
            return state
    
    def _finalize_node(self, state: RAGState) -> RAGState:
        """Finalize the response."""
        try:
            if state.get("error"):
                state["answer"] = "I encountered an error while processing your request. Please try again."
                state["confidence"] = 0.0
            
            # Ensure we have a valid answer
            if not state.get("answer"):
                state["answer"] = "I don't have enough information to answer your question."
                state["confidence"] = 0.0
            
            return state
            
        except Exception as e:
            logger.error(f"Finalize node error: {e}")
            state["error"] = f"Finalization error: {str(e)}"
            return state
    
    def _handle_error_node(self, state: RAGState) -> RAGState:
        """Handle errors in the workflow."""
        error_msg = state.get("error", "Unknown error occurred")
        logger.error(f"RAG workflow error: {error_msg}")
        
        state["answer"] = "I encountered an error while processing your request. Please try again or contact support if the issue persists."
        state["confidence"] = 0.0
        state["citations"] = []
        
        return state
    
    def _extract_citations(self, answer: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract citation information from the answer."""
        citations = []
        
        # Look for citation patterns like [filename#chunk]
        import re
        citation_pattern = r'\[([^\]]+)#(\d+)\]'
        matches = re.findall(citation_pattern, answer)
        
        for filename, chunk_idx in matches:
            # Find matching chunk
            for chunk in chunks:
                if (chunk["filename"] == filename and 
                    chunk["chunk_index"] == int(chunk_idx)):
                    
                    citation = {
                        "doc_id": chunk["doc_id"],
                        "filename": chunk["filename"],
                        "chunk_index": chunk["chunk_index"],
                        "score": chunk["score"],
                        "snippet": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"]
                    }
                    citations.append(citation)
                    break
        
        # If no explicit citations found, include top chunks as potential sources
        if not citations and chunks:
            for chunk in chunks[:3]:  # Top 3 chunks
                citation = {
                    "doc_id": chunk["doc_id"],
                    "filename": chunk["filename"],
                    "chunk_index": chunk["chunk_index"],
                    "score": chunk["score"],
                    "snippet": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"]
                }
                citations.append(citation)
        
        return citations
    
    def _calculate_confidence(self, chunks: List[Dict[str, Any]], answer: str) -> float:
        """Calculate confidence score for the answer."""
        if not chunks:
            return 0.0
        
        # Base confidence on average chunk score
        avg_score = sum(chunk["score"] for chunk in chunks) / len(chunks)
        
        # Boost confidence if answer has citations
        citation_boost = 0.1 if "[" in answer else 0.0
        
        # Penalize very short answers
        length_factor = min(len(answer) / 100, 1.0)
        
        confidence = (avg_score + citation_boost) * length_factor
        return min(confidence, 1.0)
    
    async def process_query(
        self,
        query: str,
        conversation_history: Optional[List[ChatMessage]] = None,
        rag_only: bool = True
    ) -> RAGResponse:
        """Process a query through the RAG workflow."""
        try:
            # Convert conversation history to dict format
            history_dict = []
            if conversation_history:
                for msg in conversation_history:
                    history_dict.append({
                        "role": msg.role,
                        "content": msg.content
                    })
            
            # Initialize state
            initial_state = RAGState(
                query=query,
                conversation_history=history_dict,
                rag_only=rag_only
            )
            
            # Run the graph
            final_state = self.graph.invoke(initial_state)
            
            # Build response
            response = RAGResponse(
                answer=final_state.get("answer", ""),
                citations=final_state.get("citations", []),
                confidence=final_state.get("confidence", 0.0),
                follow_up=final_state.get("follow_up"),
                usage=TokenUsage(**final_state["usage"]) if final_state.get("usage") else None
            )
            
            return response
            
        except Exception as e:
            logger.error(f"RAG processing error: {e}")
            return RAGResponse(
                answer="I encountered an error while processing your request. Please try again.",
                confidence=0.0
            )


# Global RAG graph instance
rag_graph = RAGGraph()
