# models/llm_client.py
"""
Centralized LLM wrapper for Gemini API.
Handles both google.genai and google.generativeai SDK variants.
"""
import os
import asyncio
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path="config/.env")

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing in config/.env")

# Try to import Gemini client variants (same logic as retriever.py)
_gemini_client = None
try:
    from google import genai as genai_client_pkg
    _gemini_client = ("google_genai", genai_client_pkg)
    logging.info("Using 'google.genai' for LLM generation.")
except Exception:
    try:
        import google.generativeai as genai_client_pkg2
        _gemini_client = ("google_generativeai", genai_client_pkg2)
        logging.info("Using 'google.generativeai' for LLM generation.")
    except Exception:
        raise RuntimeError("Neither 'google.genai' nor 'google.generativeai' could be imported.")


class GeminiClient:
    """
    Unified async LLM client supporting multiple Gemini SDK versions.
    """
    
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.client_type, self.pkg = _gemini_client
        
        if self.client_type == "google_genai":
            # Initialize google.genai.Client
            client_class = getattr(self.pkg, "Client", None)
            if client_class:
                self.client = client_class(api_key=API_KEY)
                self.model = None  # Use client.models.generate_content
            else:
                self.client = None
                self.model = None
        else:
            # google.generativeai
            self.pkg.configure(api_key=API_KEY)
            self.model = self.pkg.GenerativeModel(model_name)
            self.client = None

    async def generate(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """
        Generate text from prompt asynchronously.
        
        Args:
            prompt: Input prompt string
            max_tokens: Optional max output tokens
            
        Returns:
            Generated text string
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_generate, prompt, max_tokens)

    def _sync_generate(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """
        Synchronous generation wrapper handling multiple SDK formats.
        """
        try:
            if self.client_type == "google_genai":
                # google.genai API
                if self.client:
                    resp = self.client.models.generate_content(
                        model=self.model_name,
                        contents=prompt
                    )
                else:
                    resp = self.pkg.models.generate_content(
                        model=self.model_name,
                        contents=prompt
                    )
            else:
                # google.generativeai API
                generation_config = {}
                if max_tokens:
                    generation_config["max_output_tokens"] = max_tokens
                    
                resp = self.model.generate_content(
                    prompt,
                    generation_config=generation_config if generation_config else None
                )
            
            # Extract text from various response formats
            if hasattr(resp, "text"):
                return resp.text
            elif hasattr(resp, "candidates") and resp.candidates:
                candidate = resp.candidates[0]
                if hasattr(candidate, "content"):
                    content = candidate.content
                    if hasattr(content, "parts") and content.parts:
                        return content.parts[0].text
            
            # Fallback to string conversion
            return str(resp)
            
        except Exception as e:
            logging.error(f"LLM generation failed: {e}")
            raise RuntimeError(f"Failed to generate LLM response: {e}") from e
