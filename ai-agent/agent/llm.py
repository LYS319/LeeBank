"""
LLM 클라이언트 — Claude API 연동
사용자 자연어 입력을 받아 MCP 도구 호출 여부와 파라미터를 결정
"""

import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ────────────────────────────────────────
# MCP 도구 정의 (mcp-tools.md 스펙 기준)
# ────────────────────────────────────────

TOOLS = [
    {
        "name": "immediate_transfer",
        "description": "즉시 계좌이체를 실행합니다. 인증이 완료된 상태에서만 호출합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "toAccount":  {"type": "string",  "description": "입금 계좌번호"},
                "amount":     {"type": "number",  "description": "이체 금액 (원 단위, 양의 정수)"},
                "memo":       {"type": "string",  "description": "이체 메모 (선택)"},
            },
            "required": ["toAccount", "amount"],
        },
    },
    {
        "name": "schedule_transfer",
        "description": "예약이체를 등록합니다. 금액이 즉시 선차감(Hold)되고 예약대기 테이블에 등록됩니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "toAccount":   {"type": "string", "description": "입금 계좌번호"},
                "amount":      {"type": "number", "description": "이체 금액 (원 단위)"},
                "scheduledAt": {"type": "string", "description": "예약 실행 시각 (ISO 8601: 2024-06-12T12:00:00)"},
                "memo":        {"type": "string", "description": "이체 메모 (선택)"},
            },
            "required": ["toAccount", "amount", "scheduledAt"],
        },
    },
    {
        "name": "get_balance",
        "description": "계좌 잔액을 조회합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "accountNo": {"type": "string", "description": "조회할 계좌번호"},
            },
            "required": ["accountNo"],
        },
    },
    {
        "name": "get_history",
        "description": "거래내역을 조회합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "accountNo": {"type": "string", "description": "조회할 계좌번호"},
                "limit":     {"type": "number", "description": "조회 건수 (기본값: 10, 최대: 50)"},
            },
            "required": ["accountNo"],
        },
    },
]

# ────────────────────────────────────────
# 시스템 프롬프트
# ────────────────────────────────────────

SYSTEM_PROMPT = """당신은 LeeBank의 AI 금융 도우미입니다.
사용자의 자연어 요청을 분석하여 적절한 뱅킹 서비스를 제공합니다.

[규칙]
1. 이체/조회 요청 시 반드시 도구를 호출하세요.
2. 도구 호출 전 인증이 필요하다고 판단되면 도구를 호출하고 시스템이 인증을 처리합니다.
3. 계좌번호가 언급되지 않은 경우 사용자의 기본 계좌(fromAccount)를 사용합니다.
4. 금액은 반드시 숫자로 파싱하세요. (예: "오만원" → 50000)
5. 날짜/시간은 ISO 8601 형식으로 변환하세요. (예: "내일 낮 12시" → 2024-06-12T12:00:00)
6. 친절하고 간결하게 응답하세요.
"""

# ────────────────────────────────────────
# 핵심 함수
# ────────────────────────────────────────

def analyze_intent(message: str, account_no: str, session_id: str) -> dict:
    """
    사용자 메시지를 분석하여 의도와 도구 파라미터를 반환

    Returns:
        {
            "type": "ELICITATION" | "MESSAGE",
            "message": str,                      # 사용자에게 보여줄 메시지
            "pendingAction": {                   # 도구 호출 필요 시
                "tool": str,
                "params": dict
            } | None
        }
    """
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"[계좌번호: {account_no}]\n{message}",
            }
        ],
    )

    # 도구 호출이 필요한 경우
    if response.stop_reason == "tool_use":
        tool_block = next(b for b in response.content if b.type == "tool_use")
        tool_name = tool_block.name
        tool_params = tool_block.input

        # fromAccount 자동 주입 (이체 도구에만)
        if tool_name in ("immediate_transfer", "schedule_transfer"):
            tool_params["fromAccount"] = account_no

        # 사용자에게 보여줄 확인 메시지 생성
        confirm_message = _build_confirm_message(tool_name, tool_params)

        return {
            "type": "ELICITATION",
            "message": confirm_message,
            "pendingAction": {
                "tool": tool_name,
                "params": tool_params,
            },
        }

    # 일반 텍스트 응답
    text_block = next((b for b in response.content if b.type == "text"), None)
    return {
        "type": "MESSAGE",
        "message": text_block.text if text_block else "처리 중 오류가 발생했습니다.",
        "pendingAction": None,
    }


def _build_confirm_message(tool_name: str, params: dict) -> str:
    """도구별 사용자 확인 메시지 생성"""
    if tool_name == "immediate_transfer":
        return (
            f"{params.get('toAccount')}으로 "
            f"{int(params.get('amount', 0)):,}원을 이체합니다. "
            f"비밀번호를 입력해주세요."
        )
    elif tool_name == "schedule_transfer":
        scheduled = params.get("scheduledAt", "")
        return (
            f"{params.get('toAccount')}으로 "
            f"{int(params.get('amount', 0)):,}원을 "
            f"{scheduled}에 예약이체합니다. "
            f"비밀번호를 입력해주세요."
        )
    elif tool_name == "get_balance":
        return f"{params.get('accountNo')} 계좌의 잔액을 조회합니다. 비밀번호를 입력해주세요."
    elif tool_name == "get_history":
        return f"{params.get('accountNo')} 계좌의 거래내역을 조회합니다. 비밀번호를 입력해주세요."
    return "비밀번호를 입력해주세요."