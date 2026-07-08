import { useState } from 'react';
import { backendClient } from '../api';

export function useWebAuthn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 등록 ──────────────────────────────────────
  const register = async (memberId: string): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const { data: options } = await backendClient.post('/api/auth/webauthn/register/start', { memberId });

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: _base64ToBuffer(options.challenge),
          rp: { id: options.rpId, name: options.rpName },
          user: {
            id: _base64ToBuffer(options.userId),
            name: options.userName,
            displayName: options.userName,
          },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          timeout: options.timeout,
          attestation: 'none',
        },
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAttestationResponse;

      await backendClient.post('/api/auth/webauthn/register/finish', {
        memberId,
        credentialId:      credential.id,
        attestationObject: _bufferToBase64(response.attestationObject),
        clientDataJSON:    _bufferToBase64(response.clientDataJSON),
      });

      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || '생체인증 등록에 실패했어요.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── 인증 — memberId 없이 동작 ──────────────────
  const authenticate = async (memberId?: string): Promise<{ success: boolean; memberId?: string }> => {
    setLoading(true);
    setError('');
    try {
      // 1. 챌린지 요청 — memberId 없어도 됨
      const { data: options } = await backendClient.post('/api/auth/webauthn/login/start', 
        memberId ? { memberId } : {}
      );

      // 2. 브라우저 생체인증
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: _base64ToBuffer(options.challenge),
          rpId: options.rpId,
          timeout: options.timeout,
          userVerification: 'required',
        },
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAssertionResponse;

      // 3. 서버 서명 검증 — challengeKey 함께 전송
      const { data } = await backendClient.post('/api/auth/webauthn/login/finish', {
        challengeKey:      options.challengeKey,
        credentialId:      credential.id,
        authenticatorData: _bufferToBase64(response.authenticatorData),
        clientDataJSON:    _bufferToBase64(response.clientDataJSON),
        signature:         _bufferToBase64(response.signature),
      });

      // 서버가 memberId를 반환 — 프론트에서 ID 입력 불필요
      return { success: data.success === true, memberId: data.memberId };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || '생체인증에 실패했어요.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { register, authenticate, loading, error, setError };
}

function _base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function _bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}