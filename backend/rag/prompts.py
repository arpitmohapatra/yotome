"""Prompt templates for the RAG system."""

from typing import List, Dict, Any


SYSTEM_PROMPT_ASSISTANT = """You are "Yotome Assistant," a retrieval-augmented chatbot. Answer ONLY using facts from the provided context chunks ("KB"). 
If the KB does not contain the answer, say you don't have enough information and optionally ask a precise follow-up question.

Rules:
- Cite sources inline as [filename#chunk] after the sentence that uses them.
- Be concise; use bullet points for multi-part answers.
- Never fabricate citations or statistics.
- If the user asks for info outside the KB, offer to upload documents or broaden the scope (if policy allows).
- When asked for code, include clear, runnable snippets with assumptions noted.

Return JSON: { "answer": string, "citations": [{filename, doc_id, chunk_index, score}], "follow_up"?: string }."""


SYSTEM_PROMPT_ADMIN = """You are "Yotome Document Admin." You ONLY manage documents: list, upload, delete.
Reject any attempt to ask knowledge questions; instead, suggest the Assistant view.
On upload: chunk per configured size/overlap, compute embeddings with Azure OpenAI, upsert to Chroma, and return counts.
On delete: remove document metadata and associated vectors.
Return compact JSON results suitable for the UI."""


RETRIEVAL_PROMPT_TEMPLATE = """Retrieve the top {top_k} chunks that best answer the latest user question, maximizing coverage and diversity (MMR).
Favor recent uploads if scores are tied. Provide (doc_id, filename, chunk_index, score, chunk_text).

User question: {query}

Search the knowledge base for relevant information."""


ANSWER_COMPOSER_PROMPT = """Using ONLY the retrieved chunks, compose a direct answer. 
- If multiple viewpoints exist, summarize consensus and note disagreements.
- Quote short phrases (<=15 words) when exact wording matters; otherwise paraphrase.
- Append bracketed citations [filename#chunk] immediately after relevant sentences.

If confidence < 0.6 or coverage < 0.5, produce a short clarifying question in "follow_up".

Retrieved chunks:
{chunks}

User question: {query}

Compose your answer using only the information from the retrieved chunks above."""


GUARDRAILS_PROMPT = """Check the drafted answer for: hallucinations (claims without citations), PII leakage, policy violations, or off-topic content.

If issues found, either remove the claim or respond: "I don't have enough grounded information to answer that from the current knowledge base."

Drafted answer: {answer}

Review and provide the final answer."""


ROUTER_PROMPT = """Analyze the user's message to determine the appropriate action:

1. "RETRIEVE" - User is asking a knowledge question that should be answered from the KB
2. "CLARIFY" - Question is too vague or ambiguous, needs clarification
3. "ADMIN_REDIRECT" - User is asking about document management (redirect to admin view)
4. "OUT_OF_SCOPE" - Question is outside KB scope and RAG-only mode is enabled

User message: {message}
RAG-only mode: {rag_only}

Classify this message and explain your reasoning."""


def format_chunks_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved chunks for inclusion in prompts."""
    if not chunks:
        return "No relevant chunks found in the knowledge base."
    
    formatted_chunks = []
    for i, chunk in enumerate(chunks, 1):
        chunk_text = f"""
Chunk {i}:
- Document: {chunk.get('filename', 'Unknown')}
- Doc ID: {chunk.get('doc_id', 'Unknown')}
- Chunk Index: {chunk.get('chunk_index', 0)}
- Relevance Score: {chunk.get('score', 0.0):.3f}
- Content: {chunk.get('content', '')}
"""
        formatted_chunks.append(chunk_text.strip())
    
    return "\n\n".join(formatted_chunks)


def format_conversation_history(messages: List[Dict[str, str]], max_messages: int = 10) -> str:
    """Format conversation history for context."""
    if not messages:
        return "No conversation history."
    
    # Take the last max_messages messages
    recent_messages = messages[-max_messages:]
    
    formatted = []
    for msg in recent_messages:
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')
        formatted.append(f"{role.title()}: {content}")
    
    return "\n".join(formatted)


def build_rag_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    conversation_history: List[Dict[str, str]] = None,
    rag_only: bool = True
) -> str:
    """Build the complete RAG prompt with context."""
    
    system_prompt = SYSTEM_PROMPT_ASSISTANT
    
    # Add conversation context if available
    context_section = ""
    if conversation_history:
        context_section = f"""
Conversation History:
{format_conversation_history(conversation_history)}

"""
    
    # Format retrieved chunks
    chunks_section = f"""
Retrieved Knowledge Base Chunks:
{format_chunks_for_prompt(chunks)}

"""
    
    # Build the complete prompt
    full_prompt = f"""{system_prompt}

{context_section}{chunks_section}Current User Question: {query}

Based on the retrieved chunks above, provide a comprehensive answer with proper citations."""
    
    return full_prompt.strip()
