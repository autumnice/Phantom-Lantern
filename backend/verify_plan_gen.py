
import asyncio
import os
import json
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
        print("Testing plan generation with new prompt structure...")
        slides = await service.generate_plan(
            content="NanoDeck AI 的未来发展规划",
            slide_count=3,
            aspect_ratio="16:9",
            style_prompt="Cyberpunk futuristic style",
            detail_level="Normal"
        )
        
        print(f"\nGenerated {len(slides)} slides:")
        for slide in slides:
            print(f"\nSlide {slide.id}: {slide.title}")
            print(f"Visual Description: {slide.visualDescription}")
            
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
