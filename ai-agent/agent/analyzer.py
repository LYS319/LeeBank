"""
소비패턴 분석 모듈
거래내역을 받아 LLM으로 카테고리 분류 + 패턴 분석 + 추천 메시지 생성
"""

import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CATEGORY_SYSTEM = """당신은 금융 거래내역을 분석하는 전문가입니다.
거래 메모(memo)를 보고 아래 카테고리 중 하나로 분류하세요.

카테고리 목록:
- 식비 (카페, 식당, 배달, 마트, 편의점, 고기, 소고기, 돼지고기, 삼겹살, 치킨, 피자, 커피, 밥, 점심, 저녁, 아침, 술, 맥주, 음식, 식사, 먹다 — "고기값", "밥값", "술값" 처럼 음식 관련 단어 + "값"/"비" 패턴도 포함)
- 교통 (택시, 지하철, 버스, 주유, 주차, KTX, 기차, 항공, 교통비)
- 쇼핑 (의류, 잡화, 온라인 쇼핑, 쿠팡, 마켓, 옷, 신발, 쇼핑)
- 의료 (병원, 약국, 약, 치료, 진료, 병원비, 약값)
- 문화 (영화, 공연, 게임, 구독, 넷플릭스, 유튜브, 책, 문화비)
- 생활 (공과금, 통신, 보험, 월세, 관리비, 전기, 가스)
- 송금 (개인 간 이체, 메모가 사람 이름인 경우, 용돈, 친구비, 더치페이)
- 기타 (위 카테고리에 해당하지 않는 경우)

추가 분류 규칙:
- "~값" 패턴: 앞의 단어가 음식이면 식비, 물건이면 쇼핑
- "~비" 패턴: 교통비→교통, 병원비→의료, 친구비→송금
- 메모가 사람 이름처럼 보이면 송금으로 분류

반드시 JSON 배열로만 응답하세요. 설명 없이 JSON만 출력.
형식: [{"index": 0, "category": "식비"}, ...]"""

ANALYSIS_SYSTEM = """당신은 LeeBank의 AI 가계부 어시스턴트입니다.
사용자의 지출 통계를 보고 친근하고 실용적인 소비 분석 리포트를 작성하세요.

[작성 규칙]
1. 총 지출과 카테고리별 금액/비율을 언급하세요.
2. 가장 지출이 많은 카테고리 1~2개에 대해 구체적인 절약 팁을 제안하세요.
3. 긍정적인 소비 습관이 있다면 칭찬하세요.
4. 3~5문장으로 간결하게 작성하세요.
5. 한국어로 작성하고, 딱딱하지 않게 친근한 말투를 사용하세요.
6. 마크다운 문법(**bold**, # 제목 등)을 절대 사용하지 마세요. 일반 텍스트로만 작성하세요."""


def analyze_spending(transactions: list, account_no: str) -> dict:
    expenses = [
        t for t in transactions
        if t.get("txType") == "TRANSFER_OUT" or t.get("type") == "TRANSFER_OUT"
    ]

    if not expenses:
        return {
            "totalExpense": 0,
            "categories": [],
            "comment": "아직 지출 내역이 없어요. 이체를 시작하면 소비 패턴을 분석해 드릴게요! 💰"
        }

    categorized = _classify_categories(expenses)
    category_totals = _aggregate_by_category(categorized)
    total_expense = sum(v for v in category_totals.values())

    categories = sorted(
        [
            {
                "name": name,
                "amount": amount,
                "ratio": round(amount / total_expense * 100, 1) if total_expense > 0 else 0
            }
            for name, amount in category_totals.items()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )

    comment = _generate_comment(total_expense, categories)

    return {
        "totalExpense": total_expense,
        "categories": categories,
        "comment": comment
    }


def _classify_categories(expenses: list) -> list:
    items = [
        {"index": i, "memo": t.get("memo") or "", "amount": t.get("amount", 0)}
        for i, t in enumerate(expenses)
    ]

    prompt = f"다음 거래내역을 카테고리로 분류하세요:\n{json.dumps(items, ensure_ascii=False)}"

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system=CATEGORY_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    raw = raw.replace('```json', '').replace('```', '').strip()
    try:
        classified = json.loads(raw)
    except json.JSONDecodeError:
        classified = [{"index": i, "category": "기타"} for i in range(len(expenses))]

    category_map = {item["index"]: item["category"] for item in classified}
    result = []
    for i, t in enumerate(expenses):
        result.append({**t, "category": category_map.get(i, "기타")})
    return result


def _aggregate_by_category(categorized: list) -> dict:
    totals = {}
    for t in categorized:
        cat = t.get("category", "기타")
        totals[cat] = totals.get(cat, 0) + int(t.get("amount", 0))
    return totals


def _generate_comment(total_expense: int, categories: list) -> str:
    stats_text = f"총 지출: {total_expense:,}원\n"
    for c in categories:
        stats_text += f"  {c['name']}: {c['amount']:,}원 ({c['ratio']}%)\n"

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=512,
        system=ANALYSIS_SYSTEM,
        messages=[{"role": "user", "content": stats_text}]
    )
    return response.content[0].text.strip()
