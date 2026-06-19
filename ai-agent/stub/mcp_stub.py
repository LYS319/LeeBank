"""
MCP Stub 서버 — Spring Boot 미완성 시 사용하는 Mock 서버
mcp-tools.md 스펙 기준으로 응답 반환
USE_STUB=true 환경변수로 활성화
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI(title="MCP Stub Server")


# ────────────────────────────────────────
# Request 스키마
# ────────────────────────────────────────

class ImmediateTransferRequest(BaseModel):
    fromAccount: str
    toAccount: str
    amount: float
    memo: Optional[str] = None
    authToken: str


class ScheduleTransferRequest(BaseModel):
    fromAccount: str
    toAccount: str
    amount: float
    scheduledAt: str          # ISO 8601: 2024-06-12T12:00:00
    memo: Optional[str] = None
    authToken: str


class GetBalanceRequest(BaseModel):
    accountNo: str


class GetHistoryRequest(BaseModel):
    accountNo: str
    limit: Optional[int] = 10


# ────────────────────────────────────────
# Stub 잔액 상태 (메모리 — 재시작 시 초기화)
# ────────────────────────────────────────

STUB_BALANCE = 100_000   # 초기 잔액 10만원


# ────────────────────────────────────────
# 도구 엔드포인트
# ────────────────────────────────────────

@app.post("/tools/immediate_transfer")
def immediate_transfer(body: ImmediateTransferRequest):
    global STUB_BALANCE

    # 잔액 부족 시뮬레이션
    if body.amount > STUB_BALANCE:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "errorCode": "INSUFFICIENT_BALANCE",
                "message": "잔액이 부족합니다.",
            },
        )

    STUB_BALANCE -= body.amount
    txn_id = f"STUB-TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    return {
        "success": True,
        "transactionId": txn_id,
        "remainingBalance": STUB_BALANCE,
        "completedAt": datetime.now().isoformat(),
    }


@app.post("/tools/schedule_transfer")
def schedule_transfer(body: ScheduleTransferRequest):
    global STUB_BALANCE

    if body.amount > STUB_BALANCE:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "errorCode": "INSUFFICIENT_BALANCE",
                "message": "예약 금액만큼의 잔액이 부족합니다.",
            },
        )

    # 선차감 (Hold)
    STUB_BALANCE -= body.amount
    rsv_id = f"STUB-RSV-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    return {
        "success": True,
        "reservationId": rsv_id,
        "scheduledAt": body.scheduledAt,
        "remainingBalance": STUB_BALANCE,
        "message": "예약이 완료되었습니다.",
    }


@app.post("/tools/get_balance")
def get_balance(body: GetBalanceRequest):
    return {
        "accountNo": body.accountNo,
        "balance": STUB_BALANCE,
        "holdAmount": 0,
        "availableBalance": STUB_BALANCE,
    }


@app.post("/tools/get_history")
def get_history(body: GetHistoryRequest):
    return {
        "transactions": [
            {
                "transactionId": "STUB-TXN-001",
                "type": "TRANSFER_OUT",
                "amount": 5000,
                "counterpartAccount": "088-456-789012",
                "counterpartName": "김철수",
                "memo": "테스트 이체",
                "balanceAfter": STUB_BALANCE,
                "createdAt": datetime.now().isoformat(),
            }
        ]
    }


# ────────────────────────────────────────
# 헬스체크
# ────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "mode": "stub", "balance": STUB_BALANCE}