"""Look up a Lighter account index from a wallet address (public data, no key needed):

    python -m bot.lighter_account 0xYourWalletAddress
"""
import re
import sys

import ccxt

from .config import Config


def main() -> None:
    if len(sys.argv) != 2 or not re.fullmatch(r"0x[0-9a-fA-F]{40}", sys.argv[1]):
        print("사용법: python -m bot.lighter_account 0x1234...abcd")
        print("  '0x지갑주소' 자리에 실제 지갑 주소(0x 로 시작하는 42자리)를 넣으세요.")
        print("  MetaMask 상단 계정 이름 아래 주소를 클릭하면 복사됩니다.")
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
