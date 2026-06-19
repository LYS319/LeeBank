"""
Intent Parser — 자연어 입력을 도구 파라미터로 변환하는 전처리 모듈
LLM 호출 전 입력을 정규화하고, LLM 응답 후 파라미터를 검증/보정
"""

import re
from datetime import datetime, timedelta
from typing import Optional


# ────────────────────────────────────────
# 금액 파싱
# ────────────────────────────────────────

# 한국어 숫자 단위 매핑
KR_NUMBER_MAP = {
    "일": 1, "이": 2, "삼": 3, "사": 4, "오": 5,
    "육": 6, "칠": 7, "팔": 8, "구": 9,
    "십": 10, "백": 100, "천": 1_000,
    "만": 10_000, "십만": 100_000, "백만": 1_000_000,
}

UNIT_MAP = {
    "만": 10_000,
    "십만": 100_000,
    "백만": 1_000_000,
    "천만": 10_000_000,
    "억": 100_000_000,
}


def parse_amount(text: str) -> Optional[int]:
    """
    자연어 금액 표현을 숫자로 변환
    예: "오만원" → 50000, "5만원" → 50000, "100,000원" → 100000
    """
    # 쉼표 제거
    text = text.replace(",", "").replace(" ", "")

    # 숫자 + 단위 패턴 (예: 5만, 10만, 100만)
    for unit, multiplier in UNIT_MAP.items():
        pattern = rf"(\d+(?:\.\d+)?){unit}"
        match = re.search(pattern, text)
        if match:
            return int(float(match.group(1)) * multiplier)

    # 한글 숫자 + 단위 패턴 (예: 오만, 삼십만)
    kr_pattern = r"([일이삼사오육칠팔구십백천]+)(만|십만|백만|천만|억)"
    match = re.search(kr_pattern, text)
    if match:
        kr_num = _parse_kr_number(match.group(1))
        unit = match.group(2)
        if kr_num and unit in UNIT_MAP:
            return kr_num * UNIT_MAP[unit]

    # 순수 숫자 (예: 50000원, 5000)
    num_match = re.search(r"(\d+)", text)
    if num_match:
        return int(num_match.group(1))

    return None


def _parse_kr_number(text: str) -> Optional[int]:
    """한글 숫자 파싱 (일~천)"""
    result = 0
    current = 0
    for char in text:
        if char in KR_NUMBER_MAP:
            val = KR_NUMBER_MAP[char]
            if val >= 10:
                if current == 0:
                    current = 1
                result += current * val
                current = 0
            else:
                current = val
    result += current
    return result if result > 0 else None


# ────────────────────────────────────────
# 날짜/시간 파싱
# ────────────────────────────────────────

def parse_datetime(text: str, base: Optional[datetime] = None) -> Optional[str]:
    """
    자연어 날짜/시간 표현을 ISO 8601 형식으로 변환
    예: "내일 낮 12시" → "2024-06-12T12:00:00"
        "다음주 월요일 오전 9시" → "2024-06-17T09:00:00"
    """
    now = base or datetime.now()
    result_dt = now

    # 날짜 파싱
    if "오늘" in text:
        result_dt = now
    elif "내일" in text:
        result_dt = now + timedelta(days=1)
    elif "모레" in text:
        result_dt = now + timedelta(days=2)
    elif "다음주" in text or "다음 주" in text:
        days_ahead = 7 - now.weekday()
        result_dt = now + timedelta(days=days_ahead)

    # 요일 파싱
    weekday_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
    for day_kr, day_num in weekday_map.items():
        if f"{day_kr}요일" in text:
            days_ahead = (day_num - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            result_dt = now + timedelta(days=days_ahead)
            break

    # 시간 파싱
    hour = _parse_hour(text)
    if hour is not None:
        result_dt = result_dt.replace(hour=hour, minute=0, second=0, microsecond=0)

    # 분 파싱
    minute_match = re.search(r"(\d+)분", text)
    if minute_match:
        result_dt = result_dt.replace(minute=int(minute_match.group(1)))

    # 날짜 직접 입력 (예: 6월 15일, 06-15)
    date_match = re.search(r"(\d{1,2})월\s*(\d{1,2})일", text)
    if date_match:
        month = int(date_match.group(1))
        day = int(date_match.group(2))
        result_dt = result_dt.replace(month=month, day=day)

    return result_dt.strftime("%Y-%m-%dT%H:%M:%S")


def _parse_hour(text: str) -> Optional[int]:
    """시간 표현 파싱"""
    # 오전/오후 + 숫자
    am_match = re.search(r"오전\s*(\d{1,2})시", text)
    pm_match = re.search(r"오후\s*(\d{1,2})시", text)
    noon_match = re.search(r"낮\s*(\d{1,2})시", text)
    night_match = re.search(r"밤\s*(\d{1,2})시", text)

    if am_match:
        return int(am_match.group(1))
    if pm_match or night_match:
        match = pm_match or night_match
        hour = int(match.group(1))
        return hour + 12 if hour < 12 else hour
    if noon_match:
        hour = int(noon_match.group(1))
        return hour + 12 if hour < 12 else hour

    # 특수 표현
    if "정오" in text or "낮 12" in text:
        return 12
    if "자정" in text or "밤 12" in text:
        return 0

    # 숫자만 있는 경우 (예: 12시)
    hour_match = re.search(r"(\d{1,2})시", text)
    if hour_match:
        return int(hour_match.group(1))

    return None


# ────────────────────────────────────────
# LLM 파라미터 검증 및 보정
# ────────────────────────="────────────────
# ────────────────────────────────────────

def validate_and_fix_params(tool_name: str, params: dict, raw_message: str) -> dict:
    """
    LLM이 반환한 파라미터를 검증하고 누락/오류 보정
    """
    fixed = dict(params)

    if tool_name in ("immediate_transfer", "schedule_transfer"):
        # 금액이 누락되거나 0인 경우 raw_message에서 재파싱
        if not fixed.get("amount") or fixed["amount"] <= 0:
            parsed = parse_amount(raw_message)
            if parsed:
                fixed["amount"] = parsed

        # 예약이체 시 scheduledAt 누락 시 재파싱
        if tool_name == "schedule_transfer" and not fixed.get("scheduledAt"):
            parsed_dt = parse_datetime(raw_message)
            if parsed_dt:
                fixed["scheduledAt"] = parsed_dt

    if tool_name in ("get_balance", "get_history"):
        # accountNo 누락 시 빈 문자열 방지
        if not fixed.get("accountNo"):
            fixed["accountNo"] = ""

    return fixed


# ────────────────────────────────────────
# 도구 실행 가능 여부 검증
# ────────────────────────────────────────

def is_valid_params(tool_name: str, params: dict) -> tuple[bool, str]:
    """
    파라미터 유효성 검사
    Returns: (is_valid, error_message)
    """
    if tool_name == "immediate_transfer":
        if not params.get("toAccount"):
            return False, "입금 계좌번호가 없습니다. 계좌번호를 알려주세요."
        if not params.get("amount") or params["amount"] <= 0:
            return False, "이체 금액을 확인할 수 없습니다. 금액을 다시 말씀해주세요."

    elif tool_name == "schedule_transfer":
        if not params.get("toAccount"):
            return False, "입금 계좌번호가 없습니다. 계좌번호를 알려주세요."
        if not params.get("amount") or params["amount"] <= 0:
            return False, "이체 금액을 확인할 수 없습니다. 금액을 다시 말씀해주세요."
        if not params.get("scheduledAt"):
            return False, "예약 시각을 확인할 수 없습니다. 날짜와 시간을 다시 말씀해주세요."

    elif tool_name in ("get_balance", "get_history"):
        if not params.get("accountNo"):
            return False, "조회할 계좌번호를 확인할 수 없습니다."

    return True, ""