"""Gemini AI service for plan and image generation."""

import asyncio
import base64
import json
import re
from typing import List, Optional

from fastapi import HTTPException

from app.config import get_settings
from app.schemas.requests import AspectRatio, BatchSlideInput, ImageSize
from app.schemas.responses import BatchSlideResult, SlidePlan
from app.services.errors import create_error_response


class GeminiService:
    """Service for interacting with Google Gemini API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None

    def _get_client(self):
        """Lazily initialize the Gemini client."""
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _get_aspect_ratio_dimensions(self, aspect_ratio: AspectRatio, image_size: ImageSize) -> tuple[int, int]:
        """Get image dimensions based on aspect ratio and size."""
        base_sizes = {
            "1K": 1024,
            "2K": 2048,
            "4K": 4096,
        }
        base = base_sizes.get(image_size, 1024)

        aspect_ratios = {
            "16:9": (base, int(base * 9 / 16)),
            "4:3": (base, int(base * 3 / 4)),
            "1:1": (base, base),
            "3:4": (int(base * 3 / 4), base),
            "9:16": (int(base * 9 / 16), base),
        }
        return aspect_ratios.get(aspect_ratio, (base, int(base * 9 / 16)))

    def _build_plan_prompt(
        self,
        content: str,
        slide_count: int,
        style_prompt: str,
        detail_level: str,
    ) -> str:
        """Build the prompt for plan generation."""
        return f"""You are a professional presentation designer. Create a structured presentation plan based on the following content.

Content: {content}

Requirements:
- Number of slides: {slide_count}
- Style: {style_prompt}
- Detail level: {detail_level}
- Language: The 'title' and 'content' fields MUST be in the same language as the provided Content (e.g., if Content is in Chinese, output Chinese). The 'visualDescription' MUST be in English.

Output a JSON array of slide plans. Each slide must have:
- id: integer starting from 1
- title: slide title (concise, compelling, same language as Content)
- content: markdown-formatted content for the slide (bullet points, key information, same language as Content)
- visualDescription: detailed English description for generating an image that matches this slide's theme

Output ONLY valid JSON in this exact format:
[
  {{
    "id": 1,
    "title": "Introduction",
    "content": "- Key point 1\\n- Key point 2",
    "visualDescription": "A professional business presentation background with abstract geometric shapes in blue and white tones"
  }}
]

Important:
- Make each visualDescription detailed enough for image generation (50-100 words, in English)
- Content should be informative but concise
- Titles should be engaging and clear
- Ensure strict JSON validity"""

    def _parse_plan_response(self, response_text: str, request_id: Optional[str] = None) -> List[SlidePlan]:
        """Parse the AI response into SlidePlan objects."""
        try:
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if not json_match:
                raise ValueError("No JSON array found in response")

            json_str = json_match.group()
            slides_data = json.loads(json_str)

            if not isinstance(slides_data, list):
                raise ValueError("Response is not a JSON array")

            slides = []
            for idx, slide_data in enumerate(slides_data, start=1):
                slide = SlidePlan(
                    id=slide_data.get("id", idx),
                    title=slide_data.get("title", f"Slide {idx}"),
                    content=slide_data.get("content", ""),
                    visualDescription=slide_data.get("visualDescription", ""),
                )
                slides.append(slide)

            return slides

        except json.JSONDecodeError as e:
            create_error_response(
                "AI_GENERATION_FAILED",
                f"Failed to parse AI response as JSON: {str(e)}",
                500,
                request_id,
            )
        except Exception as e:
            create_error_response(
                "AI_GENERATION_FAILED",
                f"Failed to process AI response: {str(e)}",
                500,
                request_id,
            )

    def _handle_api_error(self, e: Exception, request_id: Optional[str], context: str = "AI generation") -> None:
        """Handle common API errors with appropriate error responses."""
        error_message = str(e).lower()
        if "rate" in error_message or "quota" in error_message:
            create_error_response("AI_RATE_LIMITED", "API rate limit exceeded", 429, request_id)
        elif "timeout" in error_message:
            create_error_response("AI_TIMEOUT", "Request timed out", 504, request_id)
        else:
            create_error_response("AI_GENERATION_FAILED", f"{context} failed: {str(e)}", 500, request_id)

    def _ensure_api_key(self, request_id: Optional[str]) -> None:
        """Ensure API key is configured."""
        if not self.api_key:
            create_error_response("INTERNAL_ERROR", "Gemini API key is not configured", 500, request_id)

    async def generate_plan(
        self,
        content: str,
        slide_count: int,
        aspect_ratio: AspectRatio,
        style_prompt: str,
        detail_level: str,
        use_search: bool = False,
        request_id: Optional[str] = None,
    ) -> List[SlidePlan]:
        """Generate presentation plan using Gemini."""
        self._ensure_api_key(request_id)

        try:
            client = self._get_client()
            prompt = self._build_plan_prompt(content, slide_count, style_prompt, detail_level)

            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.0-flash",
                contents=prompt,
            )

            if not response.text:
                create_error_response("AI_GENERATION_FAILED", "Empty response from AI model", 500, request_id)

            return self._parse_plan_response(response.text, request_id)

        except HTTPException:
            raise
        except Exception as e:
            self._handle_api_error(e, request_id, "AI generation")

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: AspectRatio,
        image_size: ImageSize,
        request_id: Optional[str] = None,
    ) -> str:
        """Generate a single image using Gemini."""
        self._ensure_api_key(request_id)

        try:
            client = self._get_client()
            from google.genai import types

            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-3-pro-image-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    image_config={
                        "aspect_ratio": aspect_ratio,
                        "image_size": image_size,
                    }
                ),
            )

            # 从响应中提取图片
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            image_data = part.inline_data.data
                            mime_type = part.inline_data.mime_type or "image/png"
                            if isinstance(image_data, bytes):
                                image_data = base64.b64encode(image_data).decode("utf-8")
                            return f"data:{mime_type};base64,{image_data}"

            create_error_response("AI_GENERATION_FAILED", "No image data returned from API", 500, request_id)

        except HTTPException:
            raise
        except Exception as e:
            self._handle_api_error(e, request_id, "Image generation")

    async def generate_images_batch(
        self,
        slides: List[BatchSlideInput],
        aspect_ratio: AspectRatio,
        image_size: ImageSize,
        request_id: Optional[str] = None,
    ) -> List[BatchSlideResult]:
        """Generate images for multiple slides sequentially."""
        results = []

        for slide in slides:
            try:
                image_base64 = await self.generate_image(
                    prompt=slide.prompt,
                    aspect_ratio=aspect_ratio,
                    image_size=image_size,
                    request_id=request_id,
                )
                results.append(BatchSlideResult(
                    id=slide.id,
                    status="success",
                    imageBase64=image_base64,
                ))
            except HTTPException as e:
                error_detail = e.detail
                if isinstance(error_detail, dict) and "error" in error_detail:
                    error_msg = error_detail["error"].get("message", str(e))
                else:
                    error_msg = str(e)
                results.append(BatchSlideResult(
                    id=slide.id,
                    status="error",
                    error=error_msg,
                ))
            except Exception as e:
                results.append(BatchSlideResult(
                    id=slide.id,
                    status="error",
                    error=str(e),
                ))

        return results


_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get or create the Gemini service singleton."""
    global _gemini_service
    if _gemini_service is None:
        settings = get_settings()
        _gemini_service = GeminiService(api_key=settings.gemini_api_key)
    return _gemini_service
