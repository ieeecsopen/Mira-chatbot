# core/cache.py
"""
Redis caching layer for MIRA.
Caches embeddings, LLM responses, and RAG results to reduce API calls and improve latency.
"""
import json
import hashlib
import logging
from typing import Optional, List, Dict, Any
from datetime import timedelta

try:
    import redis
    _HAS_REDIS = True
except ImportError:
    _HAS_REDIS = False

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Manages Redis caching for MIRA.
    Caches:
    - Query embeddings
    - LLM responses
    - Retrieved documents
    - Full chat responses
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        enabled: bool = True,
        default_ttl: int = 3600  # 1 hour
    ):
        self.enabled = enabled and _HAS_REDIS
        self.default_ttl = default_ttl
        self.client: Optional[redis.Redis] = None
        
        if self.enabled:
            try:
                self.client = redis.from_url(redis_url, decode_responses=True)
                self.client.ping()
                logger.info(f"✅ Redis cache connected: {redis_url}")
            except Exception as e:
                logger.warning(f"⚠️  Redis unavailable, caching disabled: {e}")
                self.enabled = False
        else:
            if not _HAS_REDIS:
                logger.warning("⚠️  Redis package not installed, caching disabled")
            else:
                logger.info("ℹ️  Caching disabled by configuration")
    
    def _generate_key(self, prefix: str, data: str) -> str:
        """Generate cache key from prefix and data hash."""
        hash_val = hashlib.sha256(data.encode('utf-8')).hexdigest()[:16]
        return f"mira:{prefix}:{hash_val}"
    
    # ==================== Embedding Cache ====================
    
    def get_embedding(self, text: str) -> Optional[List[float]]:
        """Get cached embedding for text."""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("embed", text)
            cached = self.client.get(key)
            if cached:
                logger.debug(f"✅ Cache HIT: embedding for '{text[:50]}...'")
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: embedding")
            return None
        except Exception as e:
            logger.error(f"Cache read error: {e}")
            return None
    
    def set_embedding(self, text: str, embedding: List[float], ttl: Optional[int] = None):
        """Cache embedding for text."""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("embed", text)
            self.client.setex(
                key,
                ttl or self.default_ttl,
                json.dumps(embedding)
            )
            logger.debug(f"💾 Cached embedding for '{text[:50]}...'")
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    # ==================== LLM Response Cache ====================
    
    def get_llm_response(self, prompt: str) -> Optional[str]:
        """Get cached LLM response for prompt."""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("llm", prompt)
            cached = self.client.get(key)
            if cached:
                logger.debug(f"✅ Cache HIT: LLM response")
                return cached
            logger.debug(f"❌ Cache MISS: LLM response")
            return None
        except Exception as e:
            logger.error(f"Cache read error: {e}")
            return None
    
    def set_llm_response(self, prompt: str, response: str, ttl: Optional[int] = None):
        """Cache LLM response for prompt."""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("llm", prompt)
            self.client.setex(
                key,
                ttl or self.default_ttl,
                response
            )
            logger.debug(f"💾 Cached LLM response")
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    # ==================== Full Chat Response Cache ====================
    
    def get_chat_response(self, user_id: str, message: str) -> Optional[Dict[str, Any]]:
        """Get cached full chat response."""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("chat", f"{user_id}:{message}")
            cached = self.client.get(key)
            if cached:
                logger.info(f"✅ Cache HIT: Full chat response for user {user_id}")
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: Chat response")
            return None
        except Exception as e:
            logger.error(f"Cache read error: {e}")
            return None
    
    def set_chat_response(
        self,
        user_id: str,
        message: str,
        response: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache full chat response."""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("chat", f"{user_id}:{message}")
            self.client.setex(
                key,
                ttl or self.default_ttl,
                json.dumps(response)
            )
            logger.info(f"💾 Cached chat response for user {user_id}")
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    # ==================== Document Cache ====================
    
    def get_documents(self, query: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached retrieved documents."""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("docs", query)
            cached = self.client.get(key)
            if cached:
                logger.debug(f"✅ Cache HIT: Retrieved documents")
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: Documents")
            return None
        except Exception as e:
            logger.error(f"Cache read error: {e}")
            return None
    
    def set_documents(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        ttl: Optional[int] = None
    ):
        """Cache retrieved documents."""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("docs", query)
            self.client.setex(
                key,
                ttl or self.default_ttl,
                json.dumps(documents)
            )
            logger.debug(f"💾 Cached {len(documents)} documents")
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    # ==================== Cache Management ====================
    
    def clear_user_cache(self, user_id: str):
        """Clear all cache entries for a user."""
        if not self.enabled:
            return
        
        try:
            pattern = f"mira:chat:*{user_id}*"
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
                logger.info(f"🗑️  Cleared {len(keys)} cache entries for user {user_id}")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    def clear_all_cache(self):
        """Clear all MIRA cache entries."""
        if not self.enabled:
            return
        
        try:
            pattern = "mira:*"
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
                logger.info(f"🗑️  Cleared {len(keys)} total cache entries")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.client.info("stats")
            pattern = "mira:*"
            keys = self.client.keys(pattern)
            
            return {
                "enabled": True,
                "total_keys": len(keys),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1) * 100
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"enabled": True, "error": str(e)}
