import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user
from config import settings
from models import User
from schemas import AIAnalyzeRequest, AIAnalyzeResponse

router = APIRouter(prefix="/api/ai", tags=["ai"], redirect_slashes=False)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-opus-4-6"
ANTHROPIC_VERSION = "2023-06-01"

# Prompt templates keyed by prompt_type
PROMPT_TEMPLATES: dict[str, str] = {
    "summary": (
        "You are a clinical data analyst specialising in fertility and gynaecology. "
        "Analyse the following list of clinical cases and provide a concise, "
        "structured summary covering: overall case volume and variety, key procedural "
        "trends, notable outcomes or complications, and any patterns worth highlighting "
        "for a clinical logbook review.\n\n"
        "Cases (JSON):\n{cases_json}\n\n"
        "Provide your analysis in clear, professional clinical language."
    ),
    "competency": (
        "You are a medical education specialist. Review the following clinical cases "
        "from a trainee's logbook and evaluate procedural competency progression. "
        "Highlight areas of strength, gaps in experience, and recommendations for "
        "further training.\n\n"
        "Cases (JSON):\n{cases_json}\n\n"
        "Structure your response with: Strengths, Areas for Development, "
        "Recommendations."
    ),
    "reflective": (
        "You are a clinical supervisor reviewing a trainee's cases. Generate a "
        "reflective practice report based on the following cases, suitable for a "
        "portfolio. Comment on clinical decision-making, outcomes, and learning points.\n\n"
        "Cases (JSON):\n{cases_json}\n\n"
        "Write in the first person as if the trainee is reflecting."
    ),
}

DEFAULT_PROMPT_TEMPLATE = (
    "You are a clinical data analyst specialising in fertility and gynaecology. "
    "Analyse the following clinical cases and respond to this request: {prompt_type}\n\n"
    "Cases (JSON):\n{cases_json}"
)


def _build_prompt(cases: list[dict], prompt_type: str) -> str:
    cases_json = json.dumps(cases, default=str, indent=2)
    template = PROMPT_TEMPLATES.get(prompt_type, DEFAULT_PROMPT_TEMPLATE)
    return template.format(cases_json=cases_json, prompt_type=prompt_type)


@router.post("/analyze", response_model=AIAnalyzeResponse)
async def analyze_cases(
    body: AIAnalyzeRequest,
    current_user: User = Depends(get_current_user),
) -> AIAnalyzeResponse:
    if not settings.CLAUDE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is not configured on this server",
        )

    if not body.cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No cases provided for analysis",
        )

    if len(body.cases) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many cases – maximum 500 per request",
        )

    prompt = _build_prompt(body.cases, body.prompt_type)

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 2048,
        "messages": [
            {"role": "user", "content": prompt},
        ],
    }

    headers = {
        "x-api-key": settings.CLAUDE_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI service timed out – please try again",
        )
    except httpx.HTTPStatusError as exc:
        error_body = exc.response.text
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc.response.status_code} – {error_body[:200]}",
        )

    data = response.json()
    try:
        analysis_text: str = data["content"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected response format from AI service",
        ) from exc

    return AIAnalyzeResponse(analysis=analysis_text)
