# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NanoDeck AI (幻灯侠) is a React + TypeScript application that transforms text content or web links into visually stunning presentation slides with AI-generated images using Google's Gemini 3 Pro API.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (CDN) + Font Awesome icons
- **AI Integration**: Google Gemini 3 Pro API via `@google/genai` package
- **Export**: pptxgenjs (PPTX) + jsPDF (PDF)

### Key Files
- `index.html` - Main HTML entry with CDN imports for Tailwind, Font Awesome, and export libraries
- `index.tsx` - Single-file React application containing all components and logic
- `vite.config.ts` - Vite configuration with environment variable handling
- `metadata.json` - Application metadata

### Application Flow
1. **Input Phase**: User provides text/URL, selects style, aspect ratio, detail level, and image quality
2. **Planning Phase**: AI generates presentation outline with slide plans
3. **Generation Phase**: AI generates images for each slide based on visual descriptions
4. **Preview Phase**: User can edit slide content, regenerate images, and export to PPTX/PDF

### Core Types
- `SlidePlan` - AI-generated plan for each slide (title, content, visual description)
- `SlideImage` - Generated image with status tracking (pending/generating/done/error)
- `AspectRatio` - '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
- `ImageSize` - '1K' | '2K' | '4K'
- `AppStep` - Current application step (input/planning/generating/preview)

### State Management
The application uses React useState for all state management:
- `appStep` - Current application step
- `slidePlans` - Array of AI-generated slide plans
- `slideImages` - Array of generated images with status
- `currentSlideIndex` - Currently viewed slide in preview
- Various UI state (loading, error messages, etc.)

## Environment Configuration

Create `.env.local` file in root directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

The Vite config exposes this as `process.env.GEMINI_API_KEY` and `process.env.API_KEY` to the client.

## Key Implementation Details

### AI Prompt Structure
- Uses Gemini 3 Pro for both planning and image generation
- Planning prompt creates structured JSON with slide plans
- Image generation uses visual descriptions from slide plans

### Image Generation Process
- Sequential generation with error handling and retry logic
- Status tracking for each image (pending/generating/done/error/retrying)
- Support for regenerating individual images

### Export Functionality
- PPTX export using pptxgenjs with full slide content and images
- PDF export using jsPDF (basic implementation)
- Images are embedded as base64 data URLs

### UI Components
All components are defined within `index.tsx`:
- Header, LoadingOverlay, InputSection, OutlineSection, PreviewSection, DetailView
- Consistent dark theme with Tailwind CSS classes
- Responsive design for various aspect ratios
