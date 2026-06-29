package com.bank.service;

import com.bank.dto.CredentialDto;
import com.bank.mapper.CredentialMapper;
import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.credential.CoreCredentialRecord;
import com.webauthn4j.data.*;
import com.webauthn4j.data.attestation.authenticator.COSEKey;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.Challenge;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;
import com.webauthn4j.verifier.exception.VerificationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebAuthnService {

    private final CredentialMapper credentialMapper;
    private final WebAuthnManager webAuthnManager = WebAuthnManager.createNonStrictWebAuthnManager();

    @Value("${webauthn.rp-id:leebank.duckdns.org}")
    private String rpId;

    @Value("${webauthn.origin:https://leebank.duckdns.org}")
    private String origin;

    // 챌린지 임시 저장 (운영환경에서는 Redis 사용, 여기서는 메모리)
    private final Map<String, byte[]> challengeStore = new ConcurrentHashMap<>();

    // ────────────────────────────────────────
    // 등록 (Register)
    // ────────────────────────────────────────

    public Map<String, Object> startRegistration(String memberId) {
        byte[] challengeBytes = generateChallenge();
        challengeStore.put("reg:" + memberId, challengeBytes);

        Map<String, Object> response = new HashMap<>();
        response.put("challenge", Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes));
        response.put("rpId", rpId);
        response.put("rpName", "LeeBank");
        response.put("userId", Base64.getUrlEncoder().withoutPadding().encodeToString(memberId.getBytes()));
        response.put("userName", memberId);
        response.put("timeout", 60000);
        return response;
    }

    public Map<String, Object> finishRegistration(String memberId, Map<String, String> body) {
        byte[] storedChallenge = challengeStore.remove("reg:" + memberId);
        if (storedChallenge == null) {
            throw new IllegalStateException("챌린지가 만료되었습니다. 다시 시도해주세요.");
        }

        try {
            byte[] attestationObject = Base64.getUrlDecoder().decode(body.get("attestationObject"));
            byte[] clientDataJSON    = Base64.getUrlDecoder().decode(body.get("clientDataJSON"));
            String credentialId      = body.get("credentialId");

            RegistrationRequest registrationRequest = new RegistrationRequest(attestationObject, clientDataJSON);

            ServerProperty serverProperty = new ServerProperty(
                    new Origin(origin),
                    rpId,
                    new DefaultChallenge(storedChallenge),
                    null
            );

            RegistrationParameters registrationParameters = new RegistrationParameters(serverProperty, null, false, true);
            RegistrationData registrationData = webAuthnManager.parse(registrationRequest);
            webAuthnManager.verify(registrationData, registrationParameters);

            // 공개키 저장
            COSEKey coseKey = registrationData.getAttestationObject()
                    .getAuthenticatorData()
                    .getAttestedCredentialData()
                    .getCOSEKey();

            CredentialDto credential = new CredentialDto();
            credential.setCredentialId(credentialId);
            credential.setMemberId(memberId);
            credential.setPublicKeyCose(coseKey.getBytes());  // COSE 인코딩된 공개키
            credential.setSignCount(registrationData.getAttestationObject()
                    .getAuthenticatorData().getSignCount());
            credential.setAaguid(registrationData.getAttestationObject()
                    .getAuthenticatorData().getAttestedCredentialData()
                    .getAaguid().toString());

            credentialMapper.insert(credential);

            log.info("WebAuthn 등록 완료 — memberId: {}", memberId);
            return Map.of("success", true, "message", "생체인증 등록이 완료되었습니다.");

        } catch (VerificationException e) {
            log.error("WebAuthn 등록 검증 실패 — memberId: {}, error: {}", memberId, e.getMessage());
            throw new IllegalArgumentException("생체인증 등록 검증에 실패했습니다.");
        }
    }

    // ────────────────────────────────────────
    // 인증 (Login)
    // ────────────────────────────────────────

    public Map<String, Object> startLogin(String memberId) {
        byte[] challengeBytes = generateChallenge();
        challengeStore.put("auth:" + memberId, challengeBytes);

        Map<String, Object> response = new HashMap<>();
        response.put("challenge", Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes));
        response.put("rpId", rpId);
        response.put("timeout", 60000);
        return response;
    }

    public Map<String, Object> finishLogin(String memberId, Map<String, String> body) {
        byte[] storedChallenge = challengeStore.remove("auth:" + memberId);
        if (storedChallenge == null) {
            throw new IllegalStateException("챌린지가 만료되었습니다. 다시 시도해주세요.");
        }

        try {
            String credentialId    = body.get("credentialId");
            byte[] authenticatorData = Base64.getUrlDecoder().decode(body.get("authenticatorData"));
            byte[] clientDataJSON    = Base64.getUrlDecoder().decode(body.get("clientDataJSON"));
            byte[] signature         = Base64.getUrlDecoder().decode(body.get("signature"));

            // DB에서 공개키 조회
            CredentialDto stored = credentialMapper.selectByCredentialId(credentialId);
            if (stored == null) {
                throw new IllegalArgumentException("등록되지 않은 인증기입니다.");
            }

            AuthenticationRequest authenticationRequest = new AuthenticationRequest(
                    Base64.getUrlDecoder().decode(credentialId),
                    authenticatorData,
                    clientDataJSON,
                    signature
            );

            ServerProperty serverProperty = new ServerProperty(
                    new Origin(origin),
                    rpId,
                    new DefaultChallenge(storedChallenge),
                    null
            );

            CoreCredentialRecord credentialRecord = new com.webauthn4j.credential.CredentialRecord(
                    stored.getPublicKeyCose(),
                    stored.getSignCount(),
                    true,
                    true,
                    null,
                    null
            );

            AuthenticationParameters authenticationParameters = new AuthenticationParameters(
                    serverProperty, credentialRecord, null, false, true
            );

            AuthenticationData authenticationData = webAuthnManager.parse(authenticationRequest);
            webAuthnManager.verify(authenticationData, authenticationParameters);

            // sign count 업데이트
            stored.setSignCount(authenticationData.getAuthenticatorData().getSignCount());
            credentialMapper.updateSignCount(stored);

            log.info("WebAuthn 인증 성공 — memberId: {}", memberId);
            return Map.of("success", true, "memberId", memberId, "message", "생체인증 성공");

        } catch (VerificationException e) {
            log.error("WebAuthn 인증 실패 — memberId: {}, error: {}", memberId, e.getMessage());
            throw new IllegalArgumentException("생체인증 검증에 실패했습니다.");
        }
    }

    // ────────────────────────────────────────
    // 유틸
    // ────────────────────────────────────────

    private byte[] generateChallenge() {
        byte[] challenge = new byte[32];
        new java.security.SecureRandom().nextBytes(challenge);
        return challenge;
    }
}