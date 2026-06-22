package com.bank.controller;

import com.bank.dto.AuthRequest;
import com.bank.dto.AuthResponse;
import com.bank.dto.SignupRequest;
import com.bank.dto.SignupResponse;
import com.bank.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // SHA-256 비밀번호 검증
    @PostMapping("/verify")
    public ResponseEntity<AuthResponse> verify(@Valid @RequestBody AuthRequest request) {
        log.info("인증 요청 — memberId: {}", request.getMemberId());
        AuthResponse response = authService.verify(request);

        // 인증 실패 시 401 반환
        if (!response.isSuccess()) {
            return ResponseEntity.status(401).body(response);
        }
        return ResponseEntity.ok(response);
    }

    // 아이디 중복 체크 — GET /api/auth/check-id/{memberId}
    // 응답: { "available": true/false }
    @GetMapping("/check-id/{memberId}")
    public ResponseEntity<Map<String, Boolean>> checkId(@PathVariable String memberId) {
        boolean available = authService.isIdAvailable(memberId);
        return ResponseEntity.ok(Map.of("available", available));
    }

    // 회원가입 + 계좌개설 — POST /api/auth/signup
    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        log.info("회원가입 요청 — memberId: {}", request.getMemberId());
        SignupResponse response = authService.signup(request);

        if (!response.isSuccess()) {
            return ResponseEntity.status(409).body(response);   // 409 Conflict (중복 아이디)
        }
        return ResponseEntity.ok(response);
    }
}