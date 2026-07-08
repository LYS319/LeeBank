package com.bank.config;

import com.bank.dto.TransferResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * 전역 예외 처리
 *
 * 문제: 이전에는 컨트롤러/서비스에서 예외가 나면 Spring 기본 에러 페이지가 그대로 튀어나가서
 *      "500 Internal Server Error"만 찍히고 실제 원인(SQL 에러, 검증 실패 등)이
 *      프론트/AI 에이전트 쪽에 전혀 전달되지 않았다.
 *      (ai-agent/main.py의 _call_mcp_tool은 resp.json()의 "detail" 키를 읽는데,
 *       Spring 기본 에러 응답에는 그 키가 없어서 항상 빈 detail로 처리됨)
 *
 * 이 핸들러는 최소한 success=false + message를 담은 JSON을 반환해서
 * 원인 파악과 사용자 안내를 모두 가능하게 한다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 요청 값 검증 실패 (@Valid / @NotBlank / @NotNull 등)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<TransferResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");

        log.warn("요청 검증 실패: {}", message);

        return ResponseEntity.badRequest().body(TransferResponse.builder()
                .success(false)
                .errorCode("INVALID_REQUEST")
                .message(message)
                .build());
    }

    // 그 외 처리되지 않은 모든 예외 (SQL 에러, NPE 등) — 서비스 로직에서 던진 RuntimeException 포함
    @ExceptionHandler(Exception.class)
    public ResponseEntity<TransferResponse> handleUnexpected(Exception e) {
        log.error("처리되지 않은 예외 발생", e);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(TransferResponse.builder()
                .success(false)
                .errorCode("INTERNAL_ERROR")
                .message("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
                .build());
    }
}