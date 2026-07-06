package com.bank.controller;

import com.bank.dto.MasterDepositRequest;
import com.bank.dto.MasterLoginRequest;
import com.bank.service.MasterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/master")
@RequiredArgsConstructor
public class MasterController {

    private final MasterService masterService;

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody MasterLoginRequest request) {
        try {
            return ResponseEntity.ok(masterService.login(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/accounts")
    public ResponseEntity<?> accounts(@RequestHeader(value = "X-Master-Token", required = false) String token) {
        if (!masterService.isValidToken(token)) {
            return unauthorized();
        }
        return ResponseEntity.ok(masterService.getAccounts());
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> transactions(
            @RequestHeader(value = "X-Master-Token", required = false) String token,
            @RequestParam(defaultValue = "100") int limit) {
        if (!masterService.isValidToken(token)) {
            return unauthorized();
        }
        return ResponseEntity.ok(masterService.getTransactions(limit));
    }

    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(
            @RequestHeader(value = "X-Master-Token", required = false) String token,
            @Valid @RequestBody MasterDepositRequest request) {
        if (!masterService.isValidToken(token)) {
            return unauthorized();
        }
        try {
            return ResponseEntity.ok(masterService.deposit(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    private ResponseEntity<Map<String, Object>> unauthorized() {
        return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Master authentication is required."
        ));
    }
}
