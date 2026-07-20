"""Application configuration helpers."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Allow loading BOT_TOKEN from a .env file during local development.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    bot_token: str
    webapp_url: str


def load_settings() -> Settings:
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError(
            "BOT_TOKEN is not set. Provide the token via environment variable or .env file."
        )
    webapp_url = os.getenv("WEBAPP_URL", "")
    return Settings(bot_token=token, webapp_url=webapp_url)
