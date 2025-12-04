# core/prompt_builder.py
"""
Prompt building utilities for RAG and conversational chat.
"""
from typing import List, Dict, Optional


# System prompts
SYSTEM_PROMPT = """ඔබ "MIRA" - සිංහල AI සහායකයෙක්.

ඔබගේ කාර්යභාරය:
- සිංහල භාෂාවෙන් පිළිතුරු සපයන්න
- නිවැරදි, ආචාරශීලී සහ උපකාරී වන්න
- ලබා දී ඇති ලේඛන මත පදනම් වී පිළිතුරු දෙන්න
- ඔබට නොදන්නා දේ අනුමාන නොකරන්න
- විශ්වාසනීය තොරතුරු පමණක් භාවිතා කරන්න

නීති:
- සෑම විටම සිංහල භාෂාවෙන් පිළිතුරු සපයන්න
- ආරක්ෂිත සහ සදාචාරාත්මක අන්තර්ගතය පමණක් ජනනය කරන්න
- පෞද්ගලික දත්ත ගබඩා නොකරන්න
"""


def build_rag_prompt(
    question: str,
    context_chunks: List[Dict],
    system_prompt: Optional[str] = None,
    include_sources: bool = True
) -> str:
    """
    Build a RAG (Retrieval-Augmented Generation) prompt.
    
    Args:
        question: User's question
        context_chunks: List of retrieved documents with 'text' and 'filename'
        system_prompt: Optional custom system prompt (defaults to SYSTEM_PROMPT)
        include_sources: Whether to include source citations
        
    Returns:
        Complete RAG prompt string
    """
    if system_prompt is None:
        system_prompt = SYSTEM_PROMPT
    
    # Build context section
    context_text = "\n\n".join([
        f"ලේඛනය {i+1} ({chunk.get('filename', 'Unknown')}):\n{chunk.get('text', '')}"
        for i, chunk in enumerate(context_chunks)
    ])
    
    # Build sources list
    sources = []
    if include_sources:
        sources = list(set([
            chunk.get('filename', 'Unknown')
            for chunk in context_chunks
        ]))
        sources_text = "\n".join([f"- {src}" for src in sources])
    else:
        sources_text = ""
    
    # Construct full prompt
    prompt = f"""{system_prompt}

---
ලබා දී ඇති ලේඛන:

{context_text}

---
{f"මූලාශ්‍ර: {sources_text}" if sources_text else ""}

පරිශීලක ප්‍රශ්නය:
{question}

උපදෙස්: ඉහත ලේඛනවල තොරතුරු මත පදනම්ව නිවැරදි පිළිතුරක් සිංහලෙන් සපයන්න. ලේඛනවල නොමැති තොරතුරු අනුමාන නොකරන්න."""

    return prompt


def build_chat_prompt(
    question: str,
    memory_turns: List[Dict],
    system_prompt: Optional[str] = None
) -> str:
    """
    Build a conversational chat prompt with memory.
    
    Args:
        question: User's current question
        memory_turns: List of previous turns [{"q": "...", "a": "..."}]
        system_prompt: Optional custom system prompt
        
    Returns:
        Complete chat prompt string
    """
    if system_prompt is None:
        system_prompt = SYSTEM_PROMPT
    
    # Build conversation history
    if memory_turns:
        history = "\n\n".join([
            f"පරිශීලකයා: {turn.get('user', turn.get('q', ''))}\nMIRA: {turn.get('assistant', turn.get('a', ''))}"
            for turn in memory_turns
        ])
        memory_section = f"""
පෙර සංවාදය:
{history}

---
"""
    else:
        memory_section = ""
    
    # Construct full prompt
    prompt = f"""{system_prompt}

{memory_section}
පරිශීලක ප්‍රශ්නය:
{question}

උපදෙස්: මෙම ප්‍රශ්නයට සංවාද අන්දමට සිංහලෙන් පිළිතුරු දෙන්න."""

    return prompt


def build_sources_list(context_chunks: List[Dict]) -> List[str]:
    """
    Extract unique source filenames from context chunks.
    
    Args:
        context_chunks: List of retrieved documents
        
    Returns:
        List of unique source filenames
    """
    sources = set()
    for chunk in context_chunks:
        filename = chunk.get('payload', {}).get('filename') or chunk.get('filename', 'Unknown')
        if filename and filename != 'Unknown':
            sources.add(filename)
    
    return sorted(list(sources))


def calculate_confidence(best_score: float, threshold: float = 0.7) -> str:
    """
    Calculate confidence level based on similarity score.
    
    Args:
        best_score: Highest similarity score from retrieval
        threshold: Minimum score for high confidence
        
    Returns:
        Confidence level: "High", "Medium", or "Low"
    """
    if best_score is None:
        return "Low"
    
    if best_score >= threshold:
        return "High"
    elif best_score >= threshold * 0.7:
        return "Medium"
    else:
        return "Low"
