
import asyncio
import os
from dotenv import load_dotenv
from app.services.gemini import GeminiService

async def main():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("No API key found")
        return

    service = GeminiService(api_key)
    try:
        print("Testing image generation (pass-through prompt)...")
        # 使用一个具体的 prompt，模拟从 Plan 中拿到的 visualDescription
        test_prompt = "Minimalist tech style background, dark blue gradient, abstract circuit lines, neon cyan accents, 8k resolution"
        
        result = await service.generate_image(
            prompt=test_prompt,
            aspect_ratio="16:9",
            image_size="1K"
        )
        print("Success! Image data length:", len(result))
        print("Result starts with:", result[:30])
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
