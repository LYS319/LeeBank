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
      // 1. 챌린지 요청
      const { data: options } = await backendClient.post('/api/auth/webauthn/register/start', { memberId });

      // 2. 브라우저 생체인증 등록
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
            { alg: -7,  type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          timeout: options.timeout,
          attestation: 'none',
        },
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAttestationResponse;

      // 3. 서버에 공개키 저장
      await backendClient.post('/api/auth/webauthn/register/finish', {
        memberId,
        credentialId: credential.id,
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

  // ── 인증 ──────────────────────────────────────
  const authenticate = async (memberId: string): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      // 1. 챌린지 요청
      const { data: options } = await backendClient.post('/api/auth/webauthn/login/start', { memberId });

      // 2. 브라우저 생체인증 확인
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: _base64ToBuffer(options.challenge),
          rpId: options.rpId,
          timeout: options.timeout,
          userVerification: 'required',
        },
      }) as PublicKeyCredential;

      const response = credential.response as AuthenticatorAssertionResponse;

      // 3. 서버 서명 검증
      const { data } = await backendClient.post('/api/auth/webauthn/login/finish', {
        memberId,
        credentialId:    credential.id,
        authenticatorData: _bufferToBase64(response.authenticatorData),
        clientDataJSON:    _bufferToBase64(response.clientDataJSON),
        signature:         _bufferToBase64(response.signature),
      });

      return data.success === true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || '생체인증에 실패했어요.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { register, authenticate, loading, error, setError };
}

// ── 유틸 ──────────────────────────────────────
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