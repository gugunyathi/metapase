import { AuthPayload } from '../types/metapase';

export interface JsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

export type PostJson = <T>(path: string, body: unknown) => Promise<JsonResult<T>>;

const STORAGE_KEY = 'metapase:passkey';
const TIMEOUT_MS = 60000;

export const SANDBOX_AUTH: AuthPayload = { mechanism: 'biometric_passkey', signature: 'sig_valid' };

const toB64u = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64u = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const isEmbedded = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const passkeysAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && !isEmbedded()
      && typeof window.PublicKeyCredential !== 'undefined'
      && typeof navigator.credentials?.create === 'function'
      && typeof navigator.credentials?.get === 'function';
  } catch {
    return false;
  }
};

const LEGACY_STORAGE_KEY = 'mpae:passkey';

const readStoredCredential = (): string | null => {
  try {
    const current = window.localStorage?.getItem(STORAGE_KEY) ?? null;
    if (current) return current;
    const legacy = window.localStorage?.getItem(LEGACY_STORAGE_KEY) ?? null;
    if (legacy) {
      window.localStorage.setItem(STORAGE_KEY, legacy);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return legacy;
  } catch {
    return null;
  }
};

export const forgetPasskey = (): void => {
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
};

const describeWebAuthnError = (error: unknown): Error => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return new Error('Payment cancelled on your device.');
    if (error.name === 'SecurityError') return new Error('Passkeys aren’t allowed on this address. Use localhost or HTTPS.');
    if (error.name === 'InvalidStateError') return new Error('This device already has a passkey for MetaPase.');
  }
  return error instanceof Error ? error : new Error('Biometric confirmation failed.');
};

const ensurePasskey = async (post: PostJson): Promise<string> => {
  const stored = readStoredCredential();
  if (stored) return stored;
  const challengeResult = await post<{ challenge: string; rpId: string }>('/api/pay/passkey/challenge', {});
  if (!challengeResult.ok || !challengeResult.data) throw new Error('Couldn’t start passkey setup with the server.');
  const { challenge, rpId } = challengeResult.data;
  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge: fromB64u(challenge),
        rp: { name: 'MetaPase', id: rpId },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'metapase-shopper', displayName: 'MetaPase shopper' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
          { type: 'public-key', alg: -8 }
        ],
        authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
        attestation: 'none',
        timeout: TIMEOUT_MS
      }
    })) as PublicKeyCredential | null;
  } catch (error) {
    throw describeWebAuthnError(error);
  }
  if (!credential) throw new Error('Passkey setup was cancelled.');
  const response = credential.response as AuthenticatorAttestationResponse;
  const publicKey = typeof response.getPublicKey === 'function' ? response.getPublicKey() : null;
  const algorithm = typeof response.getPublicKeyAlgorithm === 'function' ? response.getPublicKeyAlgorithm() : null;
  if (!publicKey || algorithm === null) throw new Error('This browser can’t share passkey keys. Update your browser to pay with a passkey.');
  const credentialId = toB64u(credential.rawId);
  const registration = await post<{ registered?: boolean; message?: string }>('/api/pay/passkey/register', {
    challenge,
    credentialId,
    publicKeySpki: toB64u(publicKey),
    algorithm,
    clientDataJSON: toB64u(response.clientDataJSON)
  });
  if (!registration.ok || !registration.data?.registered) throw new Error(registration.data?.message ?? 'The server didn’t accept this passkey.');
  try {
    window.localStorage?.setItem(STORAGE_KEY, credentialId);
  } catch {
    return credentialId;
  }
  return credentialId;
};

export const authorizePayment = async (post: PostJson, transactionToken: string): Promise<AuthPayload> => {
  if (!passkeysAvailable()) return SANDBOX_AUTH;
  const credentialId = await ensurePasskey(post);
  const challengeResult = await post<{ challenge: string; rpId: string; message?: string }>('/api/pay/challenge', { transactionToken });
  if (!challengeResult.ok || !challengeResult.data) throw new Error(challengeResult.data?.message ?? 'Couldn’t get a payment challenge from the server.');
  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: fromB64u(challengeResult.data.challenge),
        rpId: challengeResult.data.rpId,
        allowCredentials: [{ type: 'public-key', id: fromB64u(credentialId) }],
        userVerification: 'required',
        timeout: TIMEOUT_MS
      }
    })) as PublicKeyCredential | null;
  } catch (error) {
    throw describeWebAuthnError(error);
  }
  if (!assertion) throw new Error('Payment cancelled on your device.');
  const response = assertion.response as AuthenticatorAssertionResponse;
  return {
    mechanism: 'webauthn',
    signature: toB64u(response.signature),
    credentialId,
    clientDataJSON: toB64u(response.clientDataJSON),
    authenticatorData: toB64u(response.authenticatorData)
  };
};
