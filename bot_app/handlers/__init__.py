"""Routers registration."""

from aiogram import Dispatcher

from .common import router as common_router


def register_handlers(dp: Dispatcher) -> None:
    """Attach all routers to the dispatcher."""
    dp.include_router(common_router)
