# core/preprocess.py
"""
Text preprocessing module for Sinhala and English text.
Handles Unicode normalization, whitespace cleaning, and basic transliteration detection.
"""
import unicodedata
import re
from typing import Optional


def normalize_unicode(text: str) -> str:
    """
    Normalize text to NFC (Canonical Decomposition, followed by Canonical Composition).
    This ensures Sinhala characters are in standard form.
    """
    return unicodedata.normalize("NFC", text)


def remove_extra_spaces(text: str) -> str:
    """
    Remove multiple consecutive spaces and strip leading/trailing whitespace.
    """
    return re.sub(r'\s+', ' ', text).strip()


def lowercase_english(text: str) -> str:
    """
    Lowercase only ASCII English characters, preserving Sinhala script.
    """
    result = []
    for char in text:
        if 'A' <= char <= 'Z':
            result.append(char.lower())
        else:
            result.append(char)
    return ''.join(result)


def detect_transliterated_sinhala(text: str) -> bool:
    """
    Detect potential transliterated Sinhala (e.g., "kohomada" instead of "කොහොමද").
    Returns True if text appears to be transliterated Sinhala.
    
    Simple heuristic: Check for common Sinhala romanization patterns.
    """
    # Common Sinhala transliteration patterns
    patterns = [
        r'\b(ayubowan|kohomada|mama|oya|api|umba|mokada|kiyanna|denna)\b',
        r'(aa|ee|oo|ae|ai|au)',  # Vowel elongations common in romanized Sinhala
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        if re.search(pattern, text_lower):
            return True
    return False


def clean_transliteration(text: str) -> str:
    """
    Basic cleanup for transliterated text.
    Currently just normalizes, but can be extended with transliteration conversion.
    """
    # For now, just normalize and clean spaces
    # In future, add romanization-to-Sinhala conversion library
    return remove_extra_spaces(text)


def preprocess_text(text: str, lowercase_en: bool = True) -> str:
    """
    Main preprocessing pipeline.
    
    Args:
        text: Input text string
        lowercase_en: Whether to lowercase English characters
        
    Returns:
        Preprocessed text
    """
    # Step 1: Normalize Unicode (critical for Sinhala)
    text = normalize_unicode(text)
    
    # Step 2: Remove extra whitespace
    text = remove_extra_spaces(text)
    
    # Step 3: Optionally lowercase English
    if lowercase_en:
        text = lowercase_english(text)
    
    # Step 4: Clean transliteration if detected
    if detect_transliterated_sinhala(text):
        text = clean_transliteration(text)
    
    return text
