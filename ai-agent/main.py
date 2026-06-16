"""
FastAPI 진입점 — /ai/chat, /ai/chat/confirm 라우터
"""

import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from agent.llm import analyze_intent
from agent.intent_parser import validate_and_fix_params, is_valid_params

load_dotenv()

USE_STUB = os.getenv("USE_STUB", "true").lower() == "true"
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
STUB_URL = "http://localhost:8001"   # mcp_stub.py 포트

app = FastAPI(title="LeeBank AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────
# Request / Response 스키마
# ────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    sessionId: str
    accountNo: str


class ConfirmRequest(BaseModel):
    sessionId: str
    authToken: str
    pendingAction: dict          # { "tool": str, "params": dict }


# ────────────────────────────────────────
# 라우터
# ────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": "stub" if USE_STUB else "live",
        "mcp_url": STUB_URL if USE_STUB else MCP_SERVER_URL,
    }


@app.post("/ai/chat")
async def chat(body: ChatRequest):
    """
    자연어 입력 → LLM 의도 분석 → ELICITATION 또는 MESSAGE 반환

    ELICITATION: 이체/조회 요청 → 비밀번호 입력 요청
    MESSAGE:     일반 대화 → 텍스트 응답
    """
    result = analyze_intent(
        message=body.message,
        account_no=body.accountNo,
        session_id=body.sessionId,
    )

    # 파라미터 보정 및 유효성 검사
    if result["type"] == "ELICITATION" and result.get("pendingAction"):
        tool = result["pendingAction"]["tool"]
        params = result["pendingAction"]["params"]

        # intent_parser로 파라미터 보정
        fixed_params = validate_and_fix_params(tool, params, body.message)
        result["pendingAction"]["params"] = fixed_params

        # 유효성 검사 실패 시 MESSAGE로 전환
        valid, error_msg = is_valid_params(tool, fixed_params)
        if not valid:
            return {"type": "MESSAGE", "message": error_msg}

    return result


@app.post("/ai/chat/confirm")
async def confirm(body: ConfirmRequest):
    """
    인증 완료 후 MCP 도구 실행

    1. Spring /api/auth/verify 로 SHA-256 검증
    2. 검증 통과 시 MCP 도구 호출 (stub or 실서버)
    3. 결과 메시지 반환
    """
    tool = body.pendingAction.get("tool")
    params = body.pendingAction.get("params", {})

    # 1. 인증 검증 (Spring AuthController)
    auth_result = await _verify_auth(
        member_id=params.get("fromAccount", ""),
        auth_token=body.authToken,
    )
    if not auth_result:
        raise HTTPException(status_code=401, detail={
            "type": "MESSAGE",
            "message": "비밀번호가 일치하지 않습니다. 다시 입력해주세요.",
        })

    # 2. MCP 도구 실행
    mcp_result = await _call_mcp_tool(tool, {**params, "authToken": body.authToken})

    # 3. 결과 메시지 생성
    message = _build_result_message(tool, mcp_result)
    return {"type": "MESSAGE", "message": message}


# ────────────────────────────────────────
# 내부 함수
# ────────────────────────────────────────

async def _verify_auth(member_id: str, auth_token: str) -> bool:
    """Spring /api/auth/verify 호출"""
    # stub 모드에서는 인증 자동 통과
    if USE_STUB:
        return True
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{MCP_SERVER_URL}/api/auth/verify",
                json={"memberId": member_id, "password": auth_token},
            )
            return resp.status_code == 200 and resp.json().get("success", False)
    except Exception:
        return False


async def _call_mcp_tool(tool: str, params: dict) -> dict:
    """MCP 도구 호출 (stub or 실서버)"""
    base = STUB_URL if USE_STUB else MCP_SERVER_URL

    # stub: /tools/{tool_name}
    # 실서버: /api/transfer/immediate 등 Spring 엔드포인트
    if USE_STUB:
        url = f"{base}/tools/{tool}"
    else:
        url_map = {
            "immediate_transfer": f"{base}/api/transfer/immediate",
            "schedule_transfer":  f"{base}/api/transfer/schedule",
            "get_balance":        f"{base}/api/account/{params.get('accountNo', '')}",
            "get_history":        f"{base}/api/history/{params.get('fromAccount', '')}",
        }
        url = url_map.get(tool)
        if not url:
            raise HTTPException(status_code=400, detail=f"알 수 없는 도구: {tool}")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if tool == "get_balance" and not USE_STUB:
                resp = await client.get(url)
            else:
                resp = await client.post(url, json=params)

            if resp.status_code >= 400:
                detail = resp.json().get("detail", {})
                raise HTTPException(status_code=resp.status_code, detail=detail)

            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP 호출 실패: {str(e)}")


def _build_result_message(tool: str, result: dict) -> str:
    """MCP 결과를 사용자 친화적 메시지로 변환"""
    if tool == "immediate_transfer":
        balance = int(result.get("remainingBalance", 0))
        txn_id = result.get("transactionId", "")
        return f"이체가 완료되었습니다. 거래번호: {txn_id} / 잔액: {balance:,}원"

    elif tool == "schedule_transfer":
        scheduled = result.get("scheduledAt", "")
        rsv_id = result.get("reservationId", "")
        balance = int(result.get("remainingBalance", 0))
        return f"예약이 완료되었습니다. 예약번호: {rsv_id} / 실행 시각: {scheduled} / 잔액: {balance:,}원"

    elif tool == "get_balance":
        balance = int(result.get("availableBalance", result.get("balance", 0)))
        return f"현재 잔액은 {balance:,}원입니다."

    elif tool == "get_history":
        txns = result.get("transactions", [])
        if not txns:
            return "거래내역이 없습니다."
        lines = [f"최근 거래내역 {len(txns)}건:"]
        for t in txns:
            amount = int(t.get("amount", 0))
            type_kr = "출금" if t.get("type") == "TRANSFER_OUT" else "입금"
            lines.append(f"  {type_kr} {amount:,}원 — {t.get('memo', '')}")
        return "\n".join(lines)

    return "처리가 완료되었습니다."