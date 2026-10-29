"""Settings loaded from environment variables (.env)."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


def _float(name: str, default: float) -> float:
    value = os.getenv(name)
    return float(value) if value not in (None, "") else default


def _int(name: str, default: int) -> int:
    value = os.getenv(name)
    return int(value) if value not in (None, "") else default


@dataclass
class Config:
    # Exchange
    api_key: str
    api_secret: str
    testnet: bool
    live_trading_confirm: str
    symbol: str
    timeframe: str
    leverage: int

    # Strategy
    ema_fast: int
    ema_slow: int
    rsi_period: int
    rsi_overbought: float
    rsi_oversold: float
    atr_period: int
    sl_atr_mult: float
    tp_atr_mult: float

    # Risk
    risk_per_trade: float
    max_daily_loss: float
    max_position_pct: float

    # Runtime
    poll_seconds: int
    state_file: str
    log_file: str

    # Telegram
    telegram_token: str
    telegram_chat_id: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            api_key=os.getenv("BYBIT_API_KEY", ""),
            api_secret=os.getenv("BYBIT_API_SECRET", ""),
            testnet=_bool("BYBIT_TESTNET", True),
            live_trading_confirm=os.getenv("LIVE_TRADING_CONFIRM", ""),
            symbol=os.getenv("SYMBOL", "BTC/USDT:USDT"),
            timeframe=os.getenv("TIMEFRAME", "15m"),
            leverage=_int("LEVERAGE", 3),
            ema_fast=_int("EMA_FAST", 20),
            ema_slow=_int("EMA_SLOW", 50),
            rsi_period=_int("RSI_PERIOD", 14),
            rsi_overbought=_float("RSI_OVERBOUGHT", 70),
            rsi_oversold=_float("RSI_OVERSOLD", 30),
            atr_period=_int("ATR_PERIOD", 14),
            sl_atr_mult=_float("SL_ATR_MULT", 1.5),
            tp_atr_mult=_float("TP_ATR_MULT", 3.0),
            risk_per_trade=_float("RISK_PER_TRADE", 0.01),
            max_daily_loss=_float("MAX_DAILY_LOSS", 0.05),
            max_position_pct=_float("MAX_POSITION_PCT", 0.9),
            poll_seconds=_int("POLL_SECONDS", 20),
            state_file=os.getenv("STATE_FILE", "data/state.json"),
            log_file=os.getenv("LOG_FILE", "data/bot.log"),
            telegram_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID", ""),
        )

    def validate(self) -> None:
        if not self.api_key or not self.api_secret:
            raise ValueError("BYBIT_API_KEY / BYBIT_API_SECRET 가 비어 있습니다 (.env 확인)")
        if not self.testnet and self.live_trading_confirm != "I_UNDERSTAND_THE_RISK":
            raise ValueError(
                "실거래 모드입니다. 정말 실거래하려면 LIVE_TRADING_CONFIRM=I_UNDERSTAND_THE_RISK 를 설정하세요"
            )
        if self.ema_fast >= self.ema_slow:
            raise ValueError("EMA_FAST 는 EMA_SLOW 보다 작아야 합니다")
        if not 1 <= self.leverage <= 20:
            raise ValueError("LEVERAGE 는 1~20 사이로 설정하세요")
        if not 0 < self.risk_per_trade <= 0.05:
            raise ValueError("RISK_PER_TRADE 는 0~0.05 (최대 5%) 사이로 설정하세요")
        if not 0 < self.max_daily_loss <= 0.3:
            raise ValueError("MAX_DAILY_LOSS 는 0~0.3 사이로 설정하세요")
