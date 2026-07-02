package com.bank.service;

import com.bank.dto.CredentialDto;
import com.bank.mapper.CredentialMapper;
import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.authenticator.Authenticator;
import com.webauthn4j.authenticator.AuthenticatorImpl;
import com.webauthn4j.converter.AttestedCredentialDataConverter;
import com.webauthn4j.converter.util.ObjectConverter;
import com.webauthn4j.data.*;
import com.webauthn4j.data.attestation.authenticator.AttestedCredentialData;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;
import com.webauthn4j.validator.exception.ValidationException;
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
    private final ObjectConverter objectConverter = new ObjectConverter();
    private final AttestedCredentialDataConverter credentialDataConverter =
            new AttestedCredentialDataConverter(objectConverter);

    @Value("${webauthn.rp-id:leebank.duckdns.org}")
    private String rpId;

    @Value("${webauthn.origin:https://leebank.duckdns.org}")
    private String origin;

    // 챌린지 임시 저장 (운영환경에서는 Redis 사용)
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
                    new Origin(origin), rpId,
                    new DefaultChallenge(storedChallenge), null
            );

            RegistrationParameters registrationParameters = new RegistrationParameters(
                    serverProperty, null, false, true
            );

            RegistrationData registrationData = webAuthnManager.validate(registrationRequest, registrationParameters);

            AttestedCredentialData attestedCredentialData = registrationData
                    .getAttestationObject()
                    .getAuthenticatorData()
                    .getAttestedCredentialData();

            long signCount = registrationData.getAttestationObject().getAuthenticatorData().getSignCount();
            byte[] serialized = credentialDataConverter.convert(attestedCredentialData);

            CredentialDto credential = new CredentialDto();
            credential.setCredentialId(credentialId);
            credential.setMemberId(memberId);
            credential.setPublicKeyCose(serialized);
            credential.setSignCount(signCount);
            credential.setAaguid(attestedCredentialData.getAaguid().toString());

            credentialMapper.insert(credential);
            log.info("WebAuthn 등록 완료 — memberId: {}", memberId);
            return Map.of("success", true, "message", "생체인증 등록이 완료되었습니다.");

        } catch (ValidationException e) {
            log.error("WebAuthn 등록 검증 실패 — memberId: {}, error: {}", memberId, e.getMessage());
            throw new IllegalArgumentException("생체인증 등록 검증에 실패했습니다.");
        }
    }

    // ────────────────────────────────────────
    // 인증 (Login) — memberId 없이 동작
    // ────────────────────────────────────────

    public Map<String, Object> startLogin(String memberId) {
        byte[] challengeBytes = generateChallenge();

        // memberId가 없으면 anonymous 키로 챌린지 저장
        String challengeKey = (memberId != null && !memberId.isEmpty())
                ? "auth:" + memberId
                : "auth:anon:" + UUID.randomUUID();

        challengeStore.put(challengeKey, challengeBytes);

        Map<String, Object> response = new HashMap<>();
        response.put("challenge", Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes));
        response.put("challengeKey", challengeKey);  // 프론트에서 finish 시 사용
        response.put("rpId", rpId);
        response.put("timeout", 60000);
        return response;
    }

    public Map<String, Object> finishLogin(String challengeKey, Map<String, String> body) {
        byte[] storedChallenge = challengeStore.remove(challengeKey);
        if (storedChallenge == null) {
            throw new IllegalStateException("챌린지가 만료되었습니다. 다시 시도해주세요.");
        }

        try {
            String credentialId      = body.get("credentialId");
            byte[] authenticatorData = Base64.getUrlDecoder().decode(body.get("authenticatorData"));
            byte[] clientDataJSON    = Base64.getUrlDecoder().decode(body.get("clientDataJSON"));
            byte[] signature         = Base64.getUrlDecoder().decode(body.get("signature"));

            // credentialId로 DB에서 공개키 + memberId 역조회
            CredentialDto stored = credentialMapper.selectByCredentialId(credentialId);
            if (stored == null) {
                throw new IllegalArgumentException("등록되지 않은 인증기입니다.");
            }

            AttestedCredentialData attestedCredentialData =
                    credentialDataConverter.convert(stored.getPublicKeyCose());

            Authenticator authenticator = new AuthenticatorImpl(
                    attestedCredentialData, null, stored.getSignCount()
            );

            AuthenticationRequest authenticationRequest = new AuthenticationRequest(
                    Base64.getUrlDecoder().decode(credentialId),
                    authenticatorData, clientDataJSON, signature
            );

            ServerProperty serverProperty = new ServerProperty(
                    new Origin(origin), rpId,
                    new DefaultChallenge(storedChallenge), null
            );

            AuthenticationParameters authenticationParameters = new AuthenticationParameters(
                    serverProperty, authenticator, false, true
            );

            AuthenticationData authenticationData = webAuthnManager.validate(
                    authenticationRequest, authenticationParameters
            );

            // sign count 업데이트
            stored.setSignCount(authenticationData.getAuthenticatorData().getSignCount());
            credentialMapper.updateSignCount(stored);

            // memberId를 DB에서 역조회해서 반환 — 프론트에서 ID 입력 불필요
            log.info("WebAuthn 인증 성공 — memberId: {}", stored.getMemberId());
            return Map.of("success", true, "memberId", stored.getMemberId(), "message", "생체인증 성공");

        } catch (ValidationException e) {
            log.error("WebAuthn 인증 검증 실패 — error: {}", e.getMessage());
            throw new IllegalArgumentException("생체인증 검증에 실패했습니다.");
        }
    }

    private byte[] generateChallenge() {
        byte[] challenge = new byte[32];
        new java.security.SecureRandom().nextBytes(challenge);
        return challenge;
    }
}