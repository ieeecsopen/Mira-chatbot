# rag/ingest.py
import os
import uuid
import math
from pathlib import Path
from typing import List
from pypdf import PdfReader
from tqdm import tqdm
from dotenv import load_dotenv

# Qdrant
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

# Optional local fallback
try:
    from sentence_transformers import SentenceTransformer
    _HAS_SBERT = True
except Exception:
    _HAS_SBERT = False

# Try to import Gemini GenAI client (two common packages)
_gemini_client = None
try:
    # preferred modern package import (google-genai)
    from google import genai as genai_client_pkg
    _gemini_client = ("google_genai", genai_client_pkg)
except Exception:
    try:
        # older package style previously used in examples
        import google.generativeai as genai_client_pkg2
        _gemini_client = ("google_generativeai", genai_client_pkg2)
    except Exception:
        _gemini_client = None

load_dotenv(dotenv_path="config/.env")

# Config
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = PROJECT_ROOT / "rag" / "docs"
COLLECTION_NAME = os.getenv("VECTOR_COLLECTION", "mira_docs")
QDRANT_URL = os.getenv("VECTOR_DB_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("VECTOR_DB_API_KEY", None)

# Embedding model name (Gemini)
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
# Default dim — Gemini embedding defaults vary (3072 is typical); you can override with env.
VECTOR_DIM = int(os.getenv("VECTOR_DIM", 3072))

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 600))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
BATCH_SIZE = int(os.getenv("EMBED_BATCH", 64))

# Initialize qdrant client
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Initialize local SBERT model if available (fallback)
if _HAS_SBERT:
    _sbert_model = SentenceTransformer(os.getenv("SBERT_MODEL", "all-MiniLM-L6-v2"))
else:
    _sbert_model = None

# Initialize Gemini client wrapper (lazy)
def gemini_embed_many(texts: List[str]) -> List[List[float]]:
    """
    Use Gemini embeddings. Supports passing a list of texts.
    Tries the modern `google.genai` client or falls back to `google.generativeai`.
    Returns list of vectors (list of floats) matching order of inputs.
    """
    if _gemini_client is None:
        raise RuntimeError("Gemini client not found. Install google-genai or google-generativeai.")
    name, pkg = _gemini_client
    if name == "google_genai":
        # modern package style: from google import genai
        client = getattr(pkg, "Client", None)
        if client is None:
            # some versions expose functions directly
            # try calling pkg.models...
            client = pkg
        else:
            client = client()  # create client() instance if class exists

        # embed via models.embed_content
        # The API in examples uses: client.models.embed_content(model="gemini-embedding-001", contents=[...])
        result = client.models.embed_content(model=GEMINI_EMBED_MODEL, contents=texts)
        # result.embeddings is a list of embedding objects
        embeddings = []
        if hasattr(result, 'embeddings'):
            # Modern google.genai SDK returns result.embeddings list
            for emb_obj in result.embeddings:
                if hasattr(emb_obj, 'values'):
                    # embedding has .values attribute (list of floats)
                    embeddings.append(list(emb_obj.values))
                elif isinstance(emb_obj, (list, tuple)):
                    embeddings.append(list(emb_obj))
                else:
                    raise RuntimeError(f"Unexpected embedding object type: {type(emb_obj)}")
        else:
            raise RuntimeError("Unexpected Gemini embed response shape (no embeddings field).")
        return embeddings

    else:
        # google.generativeai style
        # e.g., genai = google.generativeai; client call maybe genai.get_embeddings or genai.embed?
        gen = pkg
        # try common patterns
        try:
            # genai.Client().models.embed_content(...)
            client = getattr(gen, "Client", None)
            if client:
                client = client()
                res = client.models.embed_content(model=GEMINI_EMBED_MODEL, contents=texts)
            else:
                # fallback top-level call
                res = gen.models.embed_content(model=GEMINI_EMBED_MODEL, contents=texts)
        except Exception as e:
            raise RuntimeError(f"Gemini embedding call failed: {e}")
        # parse res
        raw = getattr(res, "embeddings", None) or res.get("embeddings") if isinstance(res, dict) else None
        if raw is None:
            # try alternative fields
            raw = getattr(res, "data", None) or res
        embeddings = []
        for item in raw:
            vec = getattr(item, "embedding", None) or item.get("embedding") if isinstance(item, dict) else None
            if vec is None:
                vec = item
            embeddings.append(list(vec))
        return embeddings

def fallback_embed_many(texts: List[str]) -> List[List[float]]:
    if not _sbert_model:
        raise RuntimeError("No fallback embedding model available. Install sentence-transformers or enable Gemini.")
    vecs = _sbert_model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return vecs.tolist()

def embed_texts_with_fallback(texts: List[str]) -> List[List[float]]:
    # Batch and attempt Gemini, otherwise fallback
    embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i+BATCH_SIZE]
        try:
            embs = gemini_embed_many(batch)
        except Exception as e:
            print(f"[WARNING] Gemini embedding failed: {e} — using local fallback.")
            embs = fallback_embed_many(batch)
        embeddings.extend(embs)
    return embeddings

# Utility: extract text
def extract_text_from_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for p in reader.pages:
        pages.append(p.extract_text() or "")
    return "\n".join(pages)

def read_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += size - overlap
    return chunks

def create_collection_if_missing():
    try:
        qdrant.get_collection(collection_name=COLLECTION_NAME)
        print(f"Collection '{COLLECTION_NAME}' exists.")
    except Exception:
        print(f"Creating collection '{COLLECTION_NAME}' (dim={VECTOR_DIM}) ...")
        qdrant.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=rest.VectorParams(size=VECTOR_DIM, distance=rest.Distance.COSINE),
        )

def ingest_docs():
    create_collection_if_missing()
    if not DOCS_DIR.exists():
        print("Docs dir not found:", DOCS_DIR)
        return
    all_files = list(DOCS_DIR.glob("**/*.*"))
    for file_path in tqdm(all_files, desc="Files"):
        if file_path.suffix.lower() in [".pdf"]:
            text = extract_text_from_pdf(file_path)
        elif file_path.suffix.lower() in [".txt", ".md"]:
            text = read_txt(file_path)
        else:
            print(f"Skipping unsupported file {file_path}")
            continue

        chunks = chunk_text(text)
        if not chunks:
            continue

        # prepare metadata & upsert in batches
        for i in range(0, len(chunks), BATCH_SIZE):
            batch_chunks = chunks[i:i+BATCH_SIZE]
            vectors = embed_texts_with_fallback(batch_chunks)
            points = []
            for j, vec in enumerate(vectors):
                idx = i + j
                # Use UUID for point ID (Qdrant requires UUID or unsigned integer)
                point_id = uuid.uuid4().hex
                payload = {"filename": file_path.name, "chunk_id": idx, "preview": batch_chunks[j][:200], "text": batch_chunks[j]}
                points.append(rest.PointStruct(id=point_id, vector=vec, payload=payload))
            qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
    print("Ingestion complete.")

if __name__ == "__main__":
    print("Ingesting from:", DOCS_DIR)
    ingest_docs()
