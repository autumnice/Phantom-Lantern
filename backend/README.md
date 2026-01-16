# Phantom-Lantern Backend

FastAPI backend for AI-powered presentation generation.

## Requirements

- Python >= 3.11
- Poetry for dependency management

## Setup

1. Install dependencies:

```bash
cd backend
poetry install
```

2. Create `.env` file from example:

```bash
cp .env.example .env
```

3. Configure your Gemini API key in `.env`:

```
GEMINI_API_KEY=your_actual_api_key
```

## Running the Server

Development mode with hot reload:

```bash
poetry run uvicorn app.main:app --reload --port 8000
```

Or using Python directly:

```bash
poetry run python -m app.main
```

The server will be available at http://localhost:8000

## API Documentation

- OpenAPI spec: http://localhost:8000/openapi.json
- Interactive docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/presentations/plan` | Generate presentation plan |
| POST | `/api/v1/presentations/generate-image` | Generate single image |
| POST | `/api/v1/presentations/generate-images` | Generate images in batch |
| POST | `/api/v1/presentations/export/pptx` | Export to PPTX |
| POST | `/api/v1/presentations/export/pdf` | Export to PDF |

## Error Handling

All errors follow the unified `ErrorEnvelope` format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "uuid"
  }
}
```

Error codes:
- `VALIDATION_ERROR` - Invalid request parameters
- `AI_GENERATION_FAILED` - AI model failed to generate content
- `AI_RATE_LIMITED` - API rate limit exceeded
- `AI_TIMEOUT` - Request timed out
- `EXPORT_FAILED` - Export operation failed
- `INTERNAL_ERROR` - Internal server error

## Testing

Run unit tests (default, no external dependencies):

```bash
poetry run pytest
```

Run with coverage:

```bash
poetry run pytest --cov=app --cov-report=html
```

Run integration tests with real Gemini API (requires valid API key):

```bash
RUN_GEMINI_INTEGRATION_TESTS=1 poetry run pytest tests/integration/
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | (required) |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |
| `CORS_ORIGINS` | Allowed CORS origins | localhost:3000,5173 |
| `EXPORT_DIR` | Directory for exported files | `./exports` |
| `RUN_GEMINI_INTEGRATION_TESTS` | Enable real Gemini tests | `false` |

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration settings
│   ├── routes/
│   │   ├── health.py    # Health check endpoint
│   │   └── presentations.py  # Presentation API endpoints
│   ├── services/
│   │   ├── gemini.py    # Gemini AI service
│   │   └── export.py    # PPTX/PDF export service
│   └── schemas/
│       ├── errors.py    # Error schemas
│       ├── requests.py  # Request schemas
│       └── responses.py # Response schemas
├── tests/
│   ├── conftest.py      # Test fixtures
│   ├── unit/            # Unit tests (mock Gemini)
│   └── integration/     # Integration tests (real Gemini)
├── pyproject.toml       # Poetry configuration
└── .env.example         # Environment template
```
