"""Basic command handlers used during early development."""

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

router = Router()

# Will be set from main.py after loading settings
webapp_url: str = ""


@router.message(CommandStart())
async def handle_start(message: Message) -> None:
    """Send welcome message with WebApp button."""
    text = (
        "Marble Race!\n\n"
        "Купуй кульки, обирай кольори та змагайся з іншими гравцями!\n"
        "Переможець забирає 90% банку."
    )

    if webapp_url:
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="Play Marble Race",
                web_app=WebAppInfo(url=webapp_url),
            )]
        ])
        await message.answer(text, reply_markup=keyboard)
    else:
        await message.answer(
            text + "\n\nWEBAPP_URL not configured. Set it in .env to enable the game."
        )


@router.message(Command("help"))
async def handle_help(message: Message) -> None:
    """Provide brief help."""
    await message.answer(
        "Команди:\n"
        "/start — запустити гру\n"
        "/help — це повідомлення\n\n"
        "Натисни кнопку 'Play Marble Race' щоб почати!"
    )
