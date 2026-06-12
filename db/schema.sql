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

-- 거래내역
CREATE TABLE TRANSACTION_LOG (
    transaction_id    VARCHAR2(30)   NOT NULL,
    from_account      VARCHAR2(30),
    to_account        VARCHAR2(30),
    amount            NUMBER(15)     NOT NULL,
    tx_type           VARCHAR2(20)   NOT NULL,   -- TRANSFER_IN | TRANSFER_OUT | HOLD | HOLD_RELEASE
    memo              VARCHAR2(200),
    balance_after     NUMBER(15),
    created_at        TIMESTAMP      DEFAULT SYSDATE,
    CONSTRAINT pk_transaction PRIMARY KEY (transaction_id)
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
CREATE SEQUENCE SEQ_TRANSACTION START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_RESERVATION  START WITH 1 INCREMENT BY 1;

-- 인덱스
CREATE INDEX idx_account_member    ON ACCOUNT(member_id);
CREATE INDEX idx_tx_from_account   ON TRANSACTION_LOG(from_account, created_at);
CREATE INDEX idx_tx_to_account     ON TRANSACTION_LOG(to_account, created_at);
CREATE INDEX idx_rsv_status_time   ON RESERVATION(status, scheduled_at);   -- Scheduler 조회용

-- ================================================================
-- v1.x 이후 변경사항은 아래에 추가 (DROP 절대 금지)
-- ================================================================

-- 예시:
-- v1.1 (YYYY-MM-DD, 팀원B): retry_count 컬럼 추가
-- ALTER TABLE RESERVATION ADD (
--     retry_count NUMBER(2) DEFAULT 0
-- );