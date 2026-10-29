"""Look up a Lighter account index from a wallet address (public data, no key needed):

    python -m bot.lighter_account 0xYourWalletAddress
"""
import sys

import ccxt

from .config import Config


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("0x"):
        print("사용법: python -m bot.lighter_account 0x지갑주소")
        sys.exit(1)
    cfg = Config.from_env()
    client = ccxt.lighter()
    if cfg.testnet:
        client.set_sandbox_mode(True)
    res = client.publicGetAccountsByL1Address({"l1_address": sys.argv[1]})
    accounts = res.get("sub_accounts") or res.get("accounts") or []
    if not accounts:
        print("이 지갑으로 만든 Lighter 계정이 없습니다. 먼저 사이트에서 지갑을 연결하고 입금(테스트 자금)을 받으세요.")
        return
    print(f"{'테스트넷' if cfg.testnet else '메인넷'} 계정:")
    for a in accounts:
        print(f"  LIGHTER_ACCOUNT_INDEX={a.get('index')}  (종류: {a.get('account_type')})")


if __name__ == "__main__":
    main()
