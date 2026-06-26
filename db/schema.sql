-- ================================================================
-- Bank 프로젝트 Oracle DB 스키마
-- 규칙: DROP 금지. 변경은 ALTER 또는 신규 테이블만 허용.
--       변경 시 반드시 버전 주석과 작성자를 표기합니다.
-- ================================================================

-- ================================================================
-- v1.0 초기 스키마 (작성자: 팀원B)
-- ================================================================

-- 회원
CREATE TABLE MEMBER (
    member_id    VARCHAR2(20)   NOT NULL,
    name         VARCHAR2(100)  NOT NULL,
    password     VARCHAR2(64)   NOT NULL,   -- SHA-256 해시값
    phone        VARCHAR2(255)  NOT NULL,   -- AES-256 암호화값
    created_at   TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_member PRIMARY KEY (member_id)
);

-- 은행 코드
CREATE TABLE BANK (
    bank_code    VARCHAR2(10)   NOT NULL,
    bank_name    VARCHAR2(50)   NOT NULL,
    CONSTRAINT pk_bank PRIMARY KEY (bank_code)
);

INSERT INTO BANK VALUES ('110', '신한은행');
INSERT INTO BANK VALUES ('088', '신한은행(구)');
INSERT INTO BANK VALUES ('020', '우리은행');
INSERT INTO BANK VALUES ('004', 'KB국민은행');
INSERT INTO BANK VALUES ('081', '하나은행');
INSERT INTO BANK VALUES ('003', 'IBK기업은행');
INSERT INTO BANK VALUES ('999', 'LeeBank');

-- 계좌 원장
CREATE TABLE ACCOUNT (
    account_no       VARCHAR2(30)   NOT NULL,
    member_id        VARCHAR2(20)   NOT NULL,
    bank_code        VARCHAR2(10)   NOT NULL,
    balance          NUMBER(15)     DEFAULT 0,
    hold_amount      NUMBER(15)     DEFAULT 0,   -- 예약이체로 선차감된 금액
    account_status   VARCHAR2(10)   DEFAULT 'ACTIVE',   -- ACTIVE | SUSPENDED | CLOSED
    created_at       TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_account    PRIMARY KEY (account_no),
    CONSTRAINT fk_account_member FOREIGN KEY (member_id) REFERENCES MEMBER(member_id),
    CONSTRAINT fk_account_bank   FOREIGN KEY (bank_code) REFERENCES BANK(bank_code),
    CONSTRAINT chk_balance   CHECK (balance >= 0),
    CONSTRAINT chk_hold      CHECK (hold_amount >= 0)
);

-- 예약 대기
CREATE TABLE RESERVATION (
    reservation_id    VARCHAR2(30)   NOT NULL,
    from_account      VARCHAR2(30)   NOT NULL,
    to_account        VARCHAR2(30)   NOT NULL,
    amount            NUMBER(15)     NOT NULL,
    memo              VARCHAR2(200),
    scheduled_at      TIMESTAMP      NOT NULL,
    status            VARCHAR2(20)   DEFAULT 'PENDING',   -- PENDING | COMPLETED | FAILED | CANCELLED
    created_at        TIMESTAMP      DEFAULT SYSDATE,
    completed_at      TIMESTAMP,
    fail_reason       VARCHAR2(500),
    CONSTRAINT pk_reservation PRIMARY KEY (reservation_id)
);

-- 시퀀스 (ID 채번용)
CREATE SEQUENCE SEQ_ACCOUNT_NO  START WITH 100001 INCREMENT BY 1;
CREATE SEQUENCE SEQ_RESERVATION  START WITH 1 INCREMENT BY 1;

-- 인덱스
CREATE INDEX idx_account_member    ON ACCOUNT(member_id);
CREATE INDEX idx_rsv_status_time   ON RESERVATION(status, scheduled_at);   -- Scheduler 조회용

-- ================================================================
-- v2.0 스키마 개편 (멘토 피드백 반영, 작성자: 팀원B)
-- 변경 내용:
--   - TRANSACTION_LOG 단일 테이블 → 입출금 원장 물리적 분리
--   - WITHDRAWAL_LEDGER, DEPOSIT_LEDGER, TRANSFER 테이블 신규 생성
--   - 기존 TRANSACTION_LOG는 TRANSACTION_LOG_OLD로 보존 (rename)
--   - TRANSACTION_LOG는 하위 호환용 VIEW로 재생성
--   - 시퀀스 추가: SEQ_WITHDRAWAL, SEQ_DEPOSIT, SEQ_TRANSFER
-- ================================================================

-- 출금 원장
CREATE TABLE WITHDRAWAL_LEDGER (
    withdrawal_id      VARCHAR2(30)   NOT NULL,
    account_no         VARCHAR2(30)   NOT NULL,
    amount             NUMBER(15)     NOT NULL,
    balance_after      NUMBER(15)     NOT NULL,
    withdrawal_type    VARCHAR2(20)   NOT NULL,   -- TRANSFER | WITHDRAW
    transfer_id        VARCHAR2(30),              -- TRANSFER 테이블 FK (이체 시)
    memo               VARCHAR2(200),
    created_at         TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_withdrawal PRIMARY KEY (withdrawal_id),
    CONSTRAINT fk_withdrawal_account FOREIGN KEY (account_no) REFERENCES ACCOUNT(account_no)
);

-- 입금 원장
CREATE TABLE DEPOSIT_LEDGER (
    deposit_id         VARCHAR2(30)   NOT NULL,
    account_no         VARCHAR2(30)   NOT NULL,
    amount             NUMBER(15)     NOT NULL,
    balance_after      NUMBER(15)     NOT NULL,
    deposit_type       VARCHAR2(20)   NOT NULL,   -- TRANSFER | DEPOSIT
    transfer_id        VARCHAR2(30),              -- TRANSFER 테이블 FK (이체 시)
    memo               VARCHAR2(200),
    created_at         TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_deposit PRIMARY KEY (deposit_id),
    CONSTRAINT fk_deposit_account FOREIGN KEY (account_no) REFERENCES ACCOUNT(account_no)
);

-- 이체 거래 (출금+입금을 묶는 상위 개념)
-- 정합성 원칙: TRANSFER 1건 = WITHDRAWAL_LEDGER 1건 + DEPOSIT_LEDGER 1건
--             반드시 같은 @Transactional 안에서 생성
CREATE TABLE TRANSFER (
    transfer_id        VARCHAR2(30)   NOT NULL,
    from_account       VARCHAR2(30)   NOT NULL,
    to_account         VARCHAR2(30)   NOT NULL,
    amount             NUMBER(15)     NOT NULL,
    memo               VARCHAR2(200),
    transfer_type      VARCHAR2(20),              -- IMMEDIATE | SCHEDULED
    status             VARCHAR2(20),              -- COMPLETED | FAILED
    withdrawal_id      VARCHAR2(30),
    deposit_id         VARCHAR2(30),
    created_at         TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_transfer PRIMARY KEY (transfer_id)
);

-- TRANSACTION_LOG VIEW (하위 호환)
-- 출금/입금을 TRANSFER로 조인하여 단일 뷰로 제공
-- 주의: 신규 개발은 WITHDRAWAL_LEDGER/DEPOSIT_LEDGER/TRANSFER를 직접 사용할 것
CREATE OR REPLACE VIEW TRANSACTION_LOG AS
SELECT
    w.withdrawal_id                         AS transaction_id,
    t.from_account,
    t.to_account,
    t.amount,
    'TRANSFER_OUT'                          AS tx_type,
    t.memo,
    w.balance_after,
    w.created_at
FROM WITHDRAWAL_LEDGER w
JOIN TRANSFER t ON w.transfer_id = t.transfer_id
UNION ALL
SELECT
    d.deposit_id                            AS transaction_id,
    t.from_account,
    t.to_account,
    t.amount,
    'TRANSFER_IN'                           AS tx_type,
    t.memo,
    d.balance_after,
    d.created_at
FROM DEPOSIT_LEDGER d
JOIN TRANSFER t ON d.transfer_id = t.transfer_id;

-- 시퀀스 추가
CREATE SEQUENCE SEQ_WITHDRAWAL  START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_DEPOSIT     START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_TRANSFER    START WITH 1 INCREMENT BY 1;

-- 인덱스 추가
CREATE INDEX idx_withdrawal_account ON WITHDRAWAL_LEDGER(account_no, created_at);
CREATE INDEX idx_deposit_account    ON DEPOSIT_LEDGER(account_no, created_at);
CREATE INDEX idx_transfer_from      ON TRANSFER(from_account, created_at);
CREATE INDEX idx_transfer_to        ON TRANSFER(to_account, created_at);