"""Telegram notifications. Silently becomes log-only when no token is configured."""
import logging

import requests

log = logging.getLogger(__name__)


class Notifier:
    def __init__(self, token: str, chat_id: str, prefix: str = ""):
        self.token = token
        self.chat_id = chat_id
        self.prefix = prefix

    @property
    def enabled(self) -> bool:
        return bool(self.token and self.chat_id)

    def send(self, text: str) -> None:
        message = f"{self.prefix}{text}"
        log.info("[알림] %s", message)
        if not self.enabled:
            return
        try:
            requests.post(
                f"https://api.telegram.org/bot{self.token}/sendMessage",
                json={"chat_id": self.chat_id, "text": message},
                timeout=10,
            )
        except requests.RequestException as e:
            # A notification failure must never stop trading logic.
            log.warning("텔레그램 전송 실패: %s", e)
