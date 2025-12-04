from models.llm_client import GeminiClient

POLISH_PROMPT = (
    "කරුණාකර පහත පාඨයේ ව්‍යාකරණ සහ අක්ෂර වින්‍යාස දෝෂ පමණක් නිවැරදි කරන්න. "
    "අර්ථය හෝ අන්තර්ගතය කිසිසේත් වෙනස් නොකරන්න. "
    "දෝෂ නොමැති නම්, මුල් පාඨය හරියටම ආපසු ලබා දෙන්න:\n\n{answer}"
)

llm = GeminiClient()

async def polish_sinhala(answer: str) -> str:
    """
    Polish Sinhala text for grammar and spelling errors.
    Skip polishing for very short responses to avoid unnecessary changes.
    """
    # Skip polishing for very short responses (likely greetings or simple answers)
    if len(answer.strip()) < 50:
        return answer
    
    prompt = POLISH_PROMPT.format(answer=answer)
    polished = await llm.generate(prompt)
    
    # If polished version is too different in length, return original
    if abs(len(polished) - len(answer)) > len(answer) * 0.5:
        return answer
    
    return polished

