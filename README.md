# LeeBank — AI 대화형 뱅킹 서비스

> 자연어 한 문장으로 이체·조회·예약까지  
> "내일 낮 12시에 친구한테 5만원 보내줘"

## 기본 서버

https://leebank.duckdns.org/

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React 18, TypeScript, Vite, Zustand |
| Backend | Spring Boot 3.4, MyBatis, Oracle XE 21c |
| AI Agent | Python 3.12, FastAPI, Claude Haiku (Anthropic) |
| Infra | AWS EC2 t3.small, nginx, DuckDNS, Let's Encrypt |
| Auth | WebAuthn/FIDO2, SHA-256, AES-256-CBC |

## 시스템 아키텍처

```
사용자 브라우저
    │
    ▼
nginx (443 HTTPS)
    ├── / ──────────→ React 빌드 파일 (정적 서빙)
    ├── /api/ ──────→ Spring Boot (8080)
    └── /ai/ ───────→ Python FastAPI (8000)
                            │
                            ▼
                      Claude API (LLM)
                            │
                            ▼
                      Spring Boot (MCP 도구 호출)
                            │
                            ▼
                      Oracle XE 21c (1521)
```

## DB 스키마 구조

```
MEMBER ──────────── ACCOUNT
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
     WITHDRAWAL_LEDGER  DEPOSIT_LEDGER  RESERVATION
            └───────────┬───────────┘
                        ▼
                     TRANSFER
                        │
                        ▼
              TRANSACTION_LOG (VIEW - 하위호환)
```

---

## 로컬 실행 방법

### 사전 요구사항

- Java 21+
- Node.js 18+
- Python 3.12+
- Oracle XE 21c (또는 EC2 Oracle 접근 가능)

---

### 1. 환경변수 설정

**backend/src/main/resources/application.yml**
```yaml
spring:
  datasource:
    url: jdbc:oracle:thin:@{DB_HOST}:1521/XEPDB1
    username: bank
    password: {DB_PASSWORD}

encryption:
  aes-key: {32자 이상 랜덤 문자열}

webauthn:
  rp-id: localhost
  origin: http://localhost:8080

cors:
  allowed-origins: http://localhost:5173
```

**ai-agent/.env**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
MCP_SERVER_URL=http://localhost:8080
USE_STUB=false
PORT=8000
```

**frontend/.env.local**
```env
VITE_AI_AGENT_URL=http://localhost:8000
VITE_BACKEND_URL=http://localhost:8080
```

---

### 2. Oracle DB 초기화

```bash
# Oracle 접속
sqlplus bank/비밀번호@localhost:1521/XEPDB1

# 스키마 실행
@db/schema.sql
```

---

### 3. Backend 실행 (Spring Boot)

```bash
cd backend

# 빌드
mvn clean package -DskipTests

# 실행
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Eclipse 사용 시: `Run As → Spring Boot App`

기동 확인:
```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

---

### 4. AI Agent 실행 (Python FastAPI)

```bash
cd ai-agent

# 가상환경 생성 (최초 1회)
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 패키지 설치 (최초 1회)
pip install -r requirements.txt

# 실행
uvicorn main:app --reload --port 8000
```

기동 확인:
```bash
curl http://localhost:8000/health
# {"status":"ok","mode":"live"}
```

---

### 5. Frontend 실행 (React)

```bash
cd frontend

# 패키지 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

### 실행 순서 요약

```
1. Oracle DB 기동 확인
2. Spring Boot 실행 (포트 8080)
3. Python FastAPI 실행 (포트 8000)
4. React 개발 서버 실행 (포트 5173)
```

---

## EC2 배포 방법

### 프론트엔드 배포

```bash
# 로컬: 빌드
cd frontend
npm run build

# EC2: 기존 파일 정리
ssh -i leebank-key.pem ubuntu@{EC2_IP} "rm -rf ~/LeeBank/frontend/dist/assets/*"

# 로컬: 업로드
scp -i leebank-key.pem -r frontend/dist ubuntu@{EC2_IP}:~/LeeBank/frontend/
```

### 백엔드 배포

```bash
# 로컬: 빌드
cd backend
mvn clean package -DskipTests

# 로컬: 업로드
scp -i leebank-key.pem \
  backend/target/backend-0.0.1-SNAPSHOT.jar \
  ubuntu@{EC2_IP}:~/LeeBank/backend/backend-0.0.1-SNAPSHOT.jar

# EC2: 재시작
ssh ubuntu@{EC2_IP} "sudo systemctl restart spring-boot"
```

### Python AI 에이전트 배포

```bash
# EC2에서
sudo systemctl restart python-ai

# 확인
curl http://localhost:8000/health
```

### EC2 서비스 상태 확인

```bash
sudo systemctl status oracle-startup
sudo systemctl status spring-boot
sudo systemctl status python-ai
```

---

## 주요 API 엔드포인트

### Spring Boot (8080)

| Method | URL | 설명 |
|---|---|---|
| POST | `/api/auth/signup` | 회원가입 + 계좌 자동 개설 |
| POST | `/api/auth/verify` | 로그인 (SHA-256 검증) |
| GET | `/api/account/{accountNo}` | 계좌 조회 |
| GET | `/api/account/by-member/{memberId}` | 회원ID로 계좌 조회 |
| GET | `/api/account/history/{accountNo}` | 거래내역 조회 |
| POST | `/api/transfer/immediate` | 즉시이체 |
| POST | `/api/transfer/schedule` | 예약이체 |
| POST | `/api/auth/webauthn/register/start` | 생체인증 등록 시작 |
| POST | `/api/auth/webauthn/register/finish` | 생체인증 등록 완료 |
| POST | `/api/auth/webauthn/login/start` | 생체인증 로그인 시작 |
| POST | `/api/auth/webauthn/login/finish` | 생체인증 로그인 완료 |

### Python FastAPI (8000)

| Method | URL | 설명 |
|---|---|---|
| POST | `/ai/chat` | 자연어 입력 → 의도 분석 |
| POST | `/ai/chat/confirm` | 인증 후 도구 실행 |
| POST | `/ai/analyze` | 소비패턴 분석 |
| GET | `/health` | 헬스체크 |

---

## 테스트 계정

```
ID: test1       / PW: 123456 / 계좌: 999-100-100021
ID: leejisung7460 / PW: 123456 / 계좌: 999-100-100001
```

> ⚠️ 테스트 계정은 개발/시연용입니다.

---

## 트러블슈팅

### Oracle 리스너가 꺼진 경우

```bash
# 수동 재시작
sudo -u oracle /opt/oracle/product/21c/dbhomeXE/bin/lsnrctl start

# 상태 확인
sudo systemctl status oracle-startup
```

### Spring Boot DB 연결 실패

```bash
# application.yml DB URL 확인
# Oracle 리스너 포트(1521) 접근 가능한지 확인
```

### 메모리 부족 시 (EC2 t3.small)

```bash
# 캐시 비우기
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# 메모리 상태 확인
free -h
```

### CORS 에러

```bash
# EC2 환경변수 확인
cat ~/LeeBank/backend/.env.ec2 | grep CORS

# Spring Boot 재시작
sudo systemctl restart spring-boot
```

---

## 부하 테스트 결과 (k6)

```
시나리오: 100명 동시 이체 (3분 30초)
총 요청: 17,145건
에러율: 0%
평균 응답시간: 19ms
p(95): 61ms
계좌조회: 100% 성공
거래내역 조회: 100% 성공
즉시이체 (동시 100명): 100% 성공
```

SELECT FOR UPDATE 비관적 락으로 동시 이체 Lost Update 방지 검증 완료.

---

## 팀

| 이름 | 역할 |
|---|---|
| 이윤성 | 팀장 · 백엔드 · AI · 인프라 |
| 이지성 | 팀원 · 프론트 · AI · 관리자 |
