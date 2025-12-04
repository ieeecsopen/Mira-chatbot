# core/retriever.py
import os
import json
import requests
import logging
from dotenv import load_dotenv
from typing import List, Dict, Any, Union

# Configure logging for better error handling
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format='%(levelname)s: %(message)s')

load_dotenv(dotenv_path="config/.env")

# --- Configuration ---
# Qdrant REST config
QDRANT_URL = os.getenv("VECTOR_DB_URL", "http://localhost:6333").rstrip('/')
COLLECTION_NAME = os.getenv("VECTOR_COLLECTION", "mira_docs")
# If your collection uses named vectors, set this
QDRANT_VECTOR_NAME = os.getenv("VECTOR_NAME") 
TOP_K = int(os.getenv("TOP_K", 4))

# Embedding config
# The newer recommended model is 'embedding-001', which has a 768-dim vector, 
# but your logs show 3072. We'll stick to the default to match the existing collection.
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001") 

# --- External Library Setup ---
_sbert_model = None
try:
    from sentence_transformers import SentenceTransformer
    SBERT_MODEL_NAME = os.getenv("SBERT_MODEL", "all-MiniLM-L6-v2")
    logging.info(f"Attempting to load SBERT model: {SBERT_MODEL_NAME}")
    _sbert_model = SentenceTransformer(SBERT_MODEL_NAME)
except ImportError:
    logging.warning("SentenceTransformer not installed. SBERT fallback is unavailable.")
except Exception as e:
    logging.error(f"Failed to initialize SBERT model: {e}")

_gemini_client = None
try:
    # Try the new client first (google.genai)
    from google import genai as genai_client_pkg
    _gemini_client = genai_client_pkg.Client(api_key=os.getenv("GEMINI_API_KEY"))
    logging.info("Using 'google.genai.Client' for embeddings.")
except ImportError:
    try:
        # Fallback to older client (google.generativeai)
        import google.generativeai as genai_client_pkg2
        # Configure is a module-level operation for the older client
        genai_client_pkg2.configure(api_key=os.getenv("GEMINI_API_KEY"))
        _gemini_client = genai_client_pkg2
        logging.info("Using 'google.generativeai' module for embeddings.")
    except ImportError:
        logging.warning("Neither 'google-genai' nor 'google-generativeai' is installed.")
    except Exception as e:
        logging.error(f"Failed to configure google.generativeai client: {e}")
except Exception as e:
    logging.error(f"Failed to initialize google.genai.Client: {e}")


# --- Embedding Helpers ---

def gemini_embed_one(text: str) -> List[float]:
    """
    Generates a single embedding using the configured Gemini client.
    FIXED: Corrected argument name from 'content' to 'contents' for the new client.
    """
    if _gemini_client is None:
        raise RuntimeError("Gemini client is not initialized.")
    
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY not found in environment")

    try:
        # If _gemini_client is the new Client object (google.genai)
        if hasattr(_gemini_client, 'models'):
            res = _gemini_client.models.embed_content(
                model=GEMINI_EMBED_MODEL, 
                contents=[text] # <--- FIX: Must use 'contents' (plural) for the new client
            )
            # New client response handling
            if res.embeddings and hasattr(res.embeddings[0], 'values'):
                # DEBUG: Added back debug logs for visibility on vector size
                logging.debug(f"Returning emb_item.values, len={len(res.embeddings[0].values)}")
                return list(res.embeddings[0].values)
            
        # If _gemini_client is the old module (google.generativeai)
        elif hasattr(_gemini_client, 'embed_content'):
            res = _gemini_client.embed_content(
                model=GEMINI_EMBED_MODEL, 
                content=text # <-- Uses 'content' (singular) for the old client
            )
            # Old client response handling
            if hasattr(res, 'embedding'):
                if hasattr(res.embedding, '__iter__') and not isinstance(res.embedding, str):
                    logging.debug(f"Returning old client embedding, len={len(list(res.embedding))}")
                    return list(res.embedding)
                return list(res.embedding)

        # Fallback for unexpected structured responses
        raise ValueError(f"Could not extract vector from Gemini response: {type(res)}")

    except Exception as e:
        # Re-raise with context
        raise RuntimeError(f"Gemini API call failed for embedding: {e}") from e

def fallback_embed_one(text: str) -> List[float]:
    """
    Generates a single embedding using the SBERT local model (384-dim).
    """
    if _sbert_model is None:
        raise RuntimeError("No local embedding model available for fallback.")
    
    embedding_vector = _sbert_model.encode(
        [text], 
        convert_to_numpy=True
    )[0].tolist()
    
    return embedding_vector

def embed_query(text: str) -> List[float]:
    """
    Main function to generate an embedding, prioritizing Gemini (3072-dim).
    """
    try:
        return gemini_embed_one(text)
    except RuntimeError as e:
        if _sbert_model:
            logging.warning(f"Gemini embed failed: {e}. Using SBERT fallback.")
            # Note: This fallback will likely cause a 400 Bad Request if the 
            # Qdrant collection expects a 3072-dim vector.
            return fallback_embed_one(text)
        else:
            raise e

# --- Qdrant REST search helper ---

def qdrant_rest_search(collection_name: str, query_vector: List[float], limit: int = 4) -> List[Dict[str, Any]]:
    """
    Call Qdrant REST /collections/{collection_name}/points/search
    """
    url = f"{QDRANT_URL}/collections/{collection_name}/points/search"
    
    if QDRANT_VECTOR_NAME:
        vector_spec = {"name": QDRANT_VECTOR_NAME, "vector": query_vector}
    else:
        vector_spec = query_vector

    payload = {
        "vector": vector_spec,
        "limit": limit,
        "with_payload": True,
        "with_vector": False
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        # Added timeout for robustness
        resp = requests.post(url, headers=headers, json=payload, timeout=10) 
        # Raises an HTTPError for 4xx or 5xx responses, like the 400 Bad Request
        resp.raise_for_status() 
    except requests.exceptions.RequestException as e:
        # This catch is where your 400 Bad Request error was converted to a RuntimeError
        raise RuntimeError(f"Qdrant search error: Connection failed or bad status code: {e}") from e

    data = resp.json()

    # Normalizing Qdrant response: handles result/hits structure
    hits = data.get("result")
    if isinstance(hits, dict) and "hits" in hits:
        hits = hits["hits"]
    elif hits is None:
        hits = data.get("hits") or data.get("result") or []
        
    normalized = []
    for h in hits:
        if isinstance(h, dict):
            payload = h.get("payload") or {} 
            score = h.get("score") 
            normalized.append({"score": score, "payload": payload})
        else:
            normalized.append({"score": None, "payload": h}) 
            
    return normalized

# --- Main retrieval function ---

def retrieve(query: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
    """
    The main retrieval function: embeds the query and searches Qdrant.
    """
    logging.info(f"Retrieving documents for query: '{query[:50]}...'")
    q_vec = embed_query(query)
    logging.info(f"Query vector generated (dim: {len(q_vec)})")
    hits = qdrant_rest_search(COLLECTION_NAME, q_vec, limit=top_k)
    logging.info(f"Found {len(hits)} document hits from Qdrant.")
    return hits