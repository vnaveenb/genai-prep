"""
LangChain multi-provider LLM abstraction.
Supports: Google Gemini, OpenAI, Anthropic, Ollama.
Provider + model + API key passed per-request — backend is stateless.
"""

from langchain_core.language_models import BaseChatModel
from app.schemas.schemas import LLMConfig


DEFAULT_MODELS = {
    "gemini": "gemini-2.0-flash",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-4-20250514",
    "ollama": "llama3.2",
}


def get_llm(config: LLMConfig, streaming: bool = False) -> BaseChatModel:
    """Create a LangChain chat model from the provided config."""
    provider = config.provider.lower()
    model = config.model or DEFAULT_MODELS.get(provider, "")

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=config.api_key,
            streaming=streaming,
            temperature=0.7,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=config.api_key,
            streaming=streaming,
            temperature=0.7,
        )
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=config.api_key,
            streaming=streaming,
            temperature=0.7,
        )
    elif provider == "ollama":
        from langchain_ollama import ChatOllama
        base_url = config.base_url or "http://localhost:11434"
        return ChatOllama(
            model=model,
            base_url=base_url,
            streaming=streaming,
            temperature=0.7,
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


async def test_connection(config: LLMConfig) -> dict:
    """Test LLM connection with a simple ping."""
    try:
        llm = get_llm(config, streaming=False)
        response = await llm.ainvoke("Say 'connected' in one word.")
        return {
            "status": "success",
            "provider": config.provider,
            "model": config.model or DEFAULT_MODELS.get(config.provider.lower(), ""),
            "response": response.content[:100],
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": config.provider,
            "error": str(e),
        }
