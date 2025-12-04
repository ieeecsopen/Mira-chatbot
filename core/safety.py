# core/safety.py
"""
Safety and content moderation module.
Pre-checks user input and post-checks LLM output for harmful content.
"""
import re
from typing import Tuple, Optional


# Blocklists for harmful content (English and Sinhala)
VIOLENCE_KEYWORDS = [
    # English
    "kill", "murder", "bomb", "weapon", "gun", "knife", "attack", "terrorism", "terror",
    "violence", "assault", "shoot", "stab", "torture", "harm", "hurt",
    # Sinhala
    "මරන්න", "මරණය", "බෝම්බ", "ආයුධ", "තුවක්කු", "පිහිය", "ප්‍රහාරය", "හානි",
]

SELF_HARM_KEYWORDS = [
    # English
    "suicide", "self-harm", "cut myself", "kill myself", "end my life", "want to die",
    "hurt myself", "self-injury",
    # Sinhala
    "සියදිවි නසා", "මාව මරා", "මැරෙන්න", "ජීවිතය අවසන්", "මැරෙන්න ඕන",
]

SEXUAL_KEYWORDS = [
    # English
    "porn", "sex", "nude", "naked", "explicit", "adult content", "nsfw",
    # Sinhala (keeping it appropriate)
    "අසභ්‍ය", "අනාචාර",
]

ILLEGAL_KEYWORDS = [
    # English
    "hack", "crack", "pirate", "steal", "illegal", "drug", "cocaine", "heroin",
    "fraud", "scam", "phishing", "malware", "exploit", "ransomware",
    # Sinhala
    "හොරකම", "නීති විරෝධී", "මත්ද්‍රව්‍ය", "වංචා", "හැක්",
]

PERSONAL_DATA_KEYWORDS = [
    "password", "credit card", "ssn", "social security", "bank account",
    "මුරපදය", "බැංකු ගිණුම", "හැඳුනුම්පත",
]

# Refusal messages
REFUSAL_SINHALA = "මට සමාවන්න, නමුත් එය ඔබට උපකාර කිරීමට මට හැකියාව නැත."
REFUSAL_ENGLISH = "I'm sorry, but I cannot assist with that request."


def pre_check(text: str) -> Tuple[bool, Optional[str]]:
    """
    Check user input for harmful content before processing.
    
    Args:
        text: User input text
        
    Returns:
        Tuple of (is_safe: bool, reason: Optional[str])
        - (True, None) if safe
        - (False, reason) if unsafe
    """
    text_lower = text.lower()
    
    # Check violence
    for keyword in VIOLENCE_KEYWORDS:
        if keyword.lower() in text_lower:
            return False, "violence"
    
    # Check self-harm
    for keyword in SELF_HARM_KEYWORDS:
        if keyword.lower() in text_lower:
            return False, "self_harm"
    
    # Check sexual content
    for keyword in SEXUAL_KEYWORDS:
        if keyword.lower() in text_lower:
            return False, "sexual"
    
    # Check illegal activity
    for keyword in ILLEGAL_KEYWORDS:
        if keyword.lower() in text_lower:
            return False, "illegal"
    
    # Check personal data requests
    for keyword in PERSONAL_DATA_KEYWORDS:
        if keyword.lower() in text_lower:
            return False, "personal_data"
    
    return True, None


def post_check(text: str) -> Tuple[bool, Optional[str]]:
    """
    Check LLM output for harmful content before returning to user.
    
    Args:
        text: LLM generated text
        
    Returns:
        Tuple of (is_safe: bool, reason: Optional[str])
    """
    # Apply same checks as pre_check
    return pre_check(text)


def get_refusal_message(language: str = "sinhala") -> str:
    """
    Get appropriate refusal message based on language.
    
    Args:
        language: "sinhala" or "english"
        
    Returns:
        Refusal message string
    """
    if language.lower() == "english":
        return REFUSAL_ENGLISH
    return REFUSAL_SINHALA


def is_safe_content(text: str) -> bool:
    """
    Simple boolean safety check.
    
    Args:
        text: Text to check
        
    Returns:
        True if safe, False if unsafe
    """
    is_safe, _ = pre_check(text)
    return is_safe


def sanitize_output(text: str) -> str:
    """
    Sanitize LLM output by removing potential harmful patterns.
    Currently just returns original text, but can be extended.
    
    Args:
        text: LLM output text
        
    Returns:
        Sanitized text
    """
    # Remove email addresses (privacy protection)
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    
    # Remove phone numbers (basic pattern)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    
    return text

