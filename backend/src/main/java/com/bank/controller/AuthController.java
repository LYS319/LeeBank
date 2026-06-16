package com.bank.controller;

import com.bank.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/verify
     * SHA-256 비밀번호 검증
     *
     * Request:  { "memberId": "user001", "password": "sha256-hashed-string" }
     * Response: { "success": true, "authToken": "session-token-string" }
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestBody Map<String, String> body) {
        String memberId  = body.get("memberId");
        String password  = body.get("password");

        if (memberId == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success",   false,
                "errorCode", "MISSING_FIELDS",
                "message",   "memberId와 password는 필수입니다."
            ));
        }

        boolean valid = authService.verify(memberId, password);

        if (valid) {
            // 간단한 세션 토큰 (실제 운영에서는 JWT 또는 세션 관리 필요)
            String authToken = memberId + "-" + System.currentTimeMillis();
            return ResponseEntity.ok(Map.of(
                "success",   true,
                "authToken", authToken
            ));
        }

        return ResponseEntity.status(401).body(Map.of(
            "success",   false,
            "errorCode", "INVALID_CREDENTIALS",
            "message",   "비밀번호가 일치하지 않습니다."
        ));
    }
}