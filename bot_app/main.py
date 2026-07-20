"""Bot entrypoint and setup."""

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode

from .config import load_settings
from .handlers import register_handlers
from .handlers import common


async def run_bot() -> None:
    """Run aiogram polling loop."""
    settings = load_settings()

    logging.basicConfig(level=logging.INFO)
    bot = Bot(token=settings.bot_token, parse_mode=ParseMode.HTML)
    dp = Dispatcher()

    # Pass webapp_url to handler module
    common.webapp_url = settings.webapp_url

    register_handlers(dp)

    logging.info("Starting Marble Race bot polling...")
    if settings.webapp_url:
        logging.info(f"WebApp URL: {settings.webapp_url}")
    else:
        logging.warning("WEBAPP_URL not set! Bot will work but game button won't appear.")

    await dp.start_polling(bot)


def main() -> None:
    """Sync wrapper used by scripts."""
    asyncio.run(run_bot())
