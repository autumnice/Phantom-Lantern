
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
key = os.getenv("GEMINI_API_KEY")
if key and key.startswith("AIza"):
    print("Found valid-looking API key")
else:
    print("No valid API key found in .env")
