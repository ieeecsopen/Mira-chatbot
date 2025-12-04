import google.generativeai as genai
from dotenv import load_dotenv
import os

# --- Configuration ---

# 1. Load the .env file
# Ensure this path is correct relative to where you run the script.
load_dotenv(dotenv_path="config/.env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # This will print an error if the key is missing from the .env file
    print("❌ API key not found! Please check your config/.env file.")
    exit()

# 2. Configure Gemini client
try:
    genai.configure(api_key=api_key)
except Exception as e:
    print(f"❌ Error configuring the API client: {e}")
    exit()

# 3. Choose a model
# Using 'gemini-2.5-flash' as it is the current, fast, and highly capable model.
# Note: If this model fails, try 'gemini-1.5-flash' or 'gemini-2.5-pro'.
MODEL_NAME = "gemini-2.5-flash"

try:
    model = genai.GenerativeModel(MODEL_NAME)
except Exception as e:
    print(f"❌ Error initializing model '{MODEL_NAME}': {e}")
    exit()

# --- API Call ---

prompt = "Hello! Who are you? Reply in Sinhala."
print(f"Sending request to {MODEL_NAME}...")

try:
    # Send the request to the Gemini API
    response = model.generate_content(prompt)

    # Print the result
    print("\n✅ Response:")
    print(response.text)

except genai.types.StopCandidateException as e:
    print(f"\n⚠️ The request was blocked due to safety settings: {e}")
except Exception as e:
    # Catch any other API or network errors
    print(f"\n❌ An unexpected error occurred during the API call: {e}")