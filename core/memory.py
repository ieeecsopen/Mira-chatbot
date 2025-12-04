# core/memory.py
"""
Enhanced memory management for MIRA.
Stores conversation history with Redis persistence and smart context window management.
"""
import json
import logging
import os
from typing import List, Dict, Optional
from datetime import datetime
from collections import defaultdict, deque

try:
    import redis
    _HAS_REDIS = True
except ImportError:
    _HAS_REDIS = False

logger = logging.getLogger(__name__)

MEMORY_WINDOW = int(os.getenv("MEMORY_WINDOW", 4))


class MemoryManager:
    """
    Enhanced memory manager with Redis persistence.
    Manages conversation history with:
    - Persistent storage across sessions
    - Automatic summarization of old conversations
    - Smart context window management
    - Conversation metadata tracking
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        memory_window: int = MEMORY_WINDOW,
        max_history: int = 50,
        ttl_days: int = 30
    ):
        self.memory_window = memory_window  # Recent turns to include in prompts
        self.max_history = max_history  # Maximum turns to store per user
        self.ttl_seconds = ttl_days * 24 * 3600
        self.client: Optional[redis.Redis] = None
        self.use_redis = _HAS_REDIS
        
        # Fallback in-memory storage (backward compatible)
        self.store = defaultdict(lambda: deque(maxlen=memory_window))
        
        if self.use_redis:
            try:
                self.client = redis.from_url(redis_url, decode_responses=True)
                self.client.ping()
                logger.info(f"✅ Memory manager using Redis: {redis_url}")
            except Exception as e:
                logger.warning(f"⚠️  Redis unavailable, using in-memory storage: {e}")
                self.use_redis = False
        else:
            logger.warning("⚠️  Redis not available, using in-memory storage")
    
    # ==================== Backward Compatible Methods ====================
    
    def push_turn(self, user_id: str, turn: dict):
        """Backward compatible: Add turn to memory."""
        # Extract user and assistant messages
        user_msg = turn.get("user", "")
        assistant_msg = turn.get("assistant", "")
        metadata = {k: v for k, v in turn.items() if k not in ["user", "assistant"]}
        
        self.add_turn(user_id, user_msg, assistant_msg, metadata)
    
    def get_recent(self, user_id: str) -> List[dict]:
        """Backward compatible: Get recent turns."""
        return self.get_recent_turns(user_id)
    
    # ==================== New Enhanced Methods ====================
    
    def add_turn(
        self,
        user_id: str,
        user_message: str,
        assistant_message: str,
        metadata: Optional[Dict] = None
    ):
        """Add a conversation turn to memory."""
        turn = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user_message,
            "assistant": assistant_message,
            "metadata": metadata or {}
        }
        
        if self.use_redis:
            self._add_turn_redis(user_id, turn)
        else:
            self._add_turn_local(user_id, turn)
    
    def _add_turn_redis(self, user_id: str, turn: Dict):
        """Add turn to Redis."""
        try:
            key = f"mira:memory:{user_id}"
            
            # Get current history
            history_json = self.client.get(key)
            history = json.loads(history_json) if history_json else []
            
            # Add new turn
            history.append(turn)
            
            # Keep only max_history most recent turns
            if len(history) > self.max_history:
                history = history[-self.max_history:]
            
            # Save back to Redis
            self.client.setex(
                key,
                self.ttl_seconds,
                json.dumps(history)
            )
            
            logger.debug(f"💾 Saved turn to Redis memory: user {user_id} (total: {len(history)})")
            
        except Exception as e:
            logger.error(f"Error saving to Redis memory: {e}")
            # Fallback to local
            self._add_turn_local(user_id, turn)
    
    def _add_turn_local(self, user_id: str, turn: Dict):
        """Add turn to local memory (deque for backward compatibility)."""
        self.store[user_id].append(turn)
        logger.debug(f"💾 Saved turn to local memory: user {user_id} (total: {len(self.store[user_id])})")
    
    def get_recent_turns(self, user_id: str, num_turns: Optional[int] = None) -> List[Dict]:
        """
        Get recent conversation turns.
        
        Args:
            user_id: User identifier
            num_turns: Number of turns to retrieve (default: memory_window)
        
        Returns:
            List of conversation turns (most recent last)
        """
        num_turns = num_turns or self.memory_window
        
        if self.use_redis:
            history = self._get_history_redis(user_id)
        else:
            history = list(self.store[user_id])
        
        # Return only the most recent turns
        return history[-num_turns:] if history else []
    
    def _get_history_redis(self, user_id: str) -> List[Dict]:
        """Get history from Redis."""
        try:
            key = f"mira:memory:{user_id}"
            history_json = self.client.get(key)
            
            if history_json:
                history = json.loads(history_json)
                logger.debug(f"📖 Retrieved {len(history)} turns from Redis for user {user_id}")
                return history
            return []
            
        except Exception as e:
            logger.error(f"Error reading Redis memory: {e}")
            return list(self.store[user_id])
    
    def get_full_history(self, user_id: str) -> List[Dict]:
        """Get complete conversation history for a user."""
        if self.use_redis:
            return self._get_history_redis(user_id)
        else:
            return list(self.store[user_id])
    
    def clear_user_memory(self, user_id: str):
        """Clear all memory for a user."""
        if self.use_redis:
            try:
                key = f"mira:memory:{user_id}"
                self.client.delete(key)
                logger.info(f"🗑️  Cleared Redis memory for user {user_id}")
            except Exception as e:
                logger.error(f"Error clearing Redis memory: {e}")
        
        # Also clear local
        if user_id in self.store:
            self.store[user_id].clear()
            logger.info(f"🗑️  Cleared local memory for user {user_id}")
    
    def get_conversation_summary(self, user_id: str) -> Dict:
        """Get summary statistics for a user's conversation."""
        history = self.get_full_history(user_id)
        
        if not history:
            return {
                "user_id": user_id,
                "total_turns": 0,
                "first_message": None,
                "last_message": None
            }
        
        return {
            "user_id": user_id,
            "total_turns": len(history),
            "first_message": history[0].get("timestamp", "Unknown"),
            "last_message": history[-1].get("timestamp", "Unknown"),
            "storage": "redis" if self.use_redis else "local"
        }
    
    def format_for_prompt(self, user_id: str, num_turns: Optional[int] = None) -> str:
        """
        Format recent conversation history for inclusion in prompts.
        
        Returns:
            Formatted string with conversation history
        """
        turns = self.get_recent_turns(user_id, num_turns)
        
        if not turns:
            return ""
        
        formatted_parts = []
        for turn in turns:
            formatted_parts.append(f"User: {turn.get('user', '')}")
            formatted_parts.append(f"Assistant: {turn.get('assistant', '')}")
        
        return "\n".join(formatted_parts)
    
    def get_memory_stats(self) -> Dict:
        """Get overall memory statistics."""
        if self.use_redis:
            try:
                pattern = "mira:memory:*"
                keys = self.client.keys(pattern)
                total_users = len(keys)
                
                return {
                    "storage": "redis",
                    "total_users": total_users,
                    "memory_window": self.memory_window,
                    "max_history_per_user": self.max_history,
                    "ttl_days": self.ttl_seconds // (24 * 3600)
                }
            except Exception as e:
                logger.error(f"Error getting memory stats: {e}")
        
        return {
            "storage": "local",
            "total_users": len(self.store),
            "memory_window": self.memory_window,
            "max_history_per_user": self.max_history
        }
