package com.bank.controller;

import com.bank.dto.AuthRequest;
import com.bank.dto.AuthResponse;
import com.bank.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}