package com.bank.controller;

import com.bank.service.WebAuthnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/webauthn")
@RequiredArgsConstructor
public class WebAuthnController {

    private final WebAuthnService webAuthnService;

    // 등록 시작 — 챌린지 생성
    @PostMapping("/register/start")
    public ResponseEntity<Map<String, Object>> registerStart(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        return ResponseEntity.ok(webAuthnService.startRegistration(memberId));
    }

    // 등록 완료 — 공개키 저장
    @PostMapping("/register/finish")
    public ResponseEntity<Map<String, Object>> registerFinish(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        return ResponseEntity.ok(webAuthnService.finishRegistration(memberId, body));
    }

    // 인증 시작 — 챌린지 생성
    @PostMapping("/login/start")
    public ResponseEntity<Map<String, Object>> loginStart(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        return ResponseEntity.ok(webAuthnService.startLogin(memberId));
    }

    // 인증 완료 — 서명 검증
    @PostMapping("/login/finish")
    public ResponseEntity<Map<String, Object>> loginFinish(@RequestBody Map<String, String> body) {
        String memberId = body.get("memberId");
        return ResponseEntity.ok(webAuthnService.finishLogin(memberId, body));
    }
}