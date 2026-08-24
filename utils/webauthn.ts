/**
 * WebAuthn & Biometric Passkey Utility for Money Shark
 * Supports Touch ID, Face ID, Android Fingerprint, and Windows Hello.
 */

// Helper: Convert ArrayBuffer to Base64URL string
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: Convert Base64URL string to ArrayBuffer
export function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Check if device supports platform biometrics (Face ID, Touch ID, Windows Hello, Android Biometrics)
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return !!isAvailable;
  } catch (err) {
    console.warn("Biometric check error:", err);
    return false;
  }
}

// Register a new biometric passkey on the current device
export async function registerDevicePasskey(
  userId: string,
  userEmail: string,
  userName: string = 'User'
): Promise<{ credentialId: string; rawId: string; deviceName: string } | null> {
  if (!(await isBiometricSupported())) {
    throw new Error("Biometric authentication is not supported or not enabled on this device.");
  }

  // Generate random 32-byte challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // Convert userId string to Uint8Array
  const encoder = new TextEncoder();
  const userIdBuffer = encoder.encode(userId);

  const rpName = "Money Shark";
  // Determine RP ID from current hostname
  const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: rpName,
      id: rpId,
    },
    user: {
      id: userIdBuffer,
      name: userEmail,
      displayName: userName || userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256 (ECDSA w/ SHA-256)
      { alg: -257, type: "public-key" }, // RS256 (RSA w/ SHA-256)
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Enforces on-device biometric (Touch ID, Face ID, Windows Hello)
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Passkey registration was cancelled.");
    }

    const credentialId = bufferToBase64Url(credential.rawId);

    // Detect device type name
    let deviceName = "Unknown Device";
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) deviceName = "Apple Device (Face ID / Touch ID)";
    else if (/Macintosh/.test(ua)) deviceName = "Mac (Touch ID)";
    else if (/Android/.test(ua)) deviceName = "Android Device (Fingerprint)";
    else if (/Windows/.test(ua)) deviceName = "Windows PC (Windows Hello)";
    else if (/Linux/.test(ua)) deviceName = "Linux Security Key";

    return {
      credentialId,
      rawId: credentialId,
      deviceName,
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error("Passkey setup was cancelled or timed out.");
    }
    throw new Error(err.message || "Failed to create biometric passkey.");
  }
}

// Verify biometric passkey to unlock the app or sign in
export async function authenticateWithBiometrics(
  credentialId?: string
): Promise<{ success: boolean; credentialId: string }> {
  if (!(await isBiometricSupported())) {
    throw new Error("Biometric authentication is not available on this device.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId,
    timeout: 60000,
    userVerification: "required",
  };

  if (credentialId) {
    requestOptions.allowCredentials = [
      {
        id: base64UrlToBuffer(credentialId),
        type: "public-key",
        transports: ["internal"],
      },
    ];
  }

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: requestOptions,
    })) as PublicKeyCredential;

    if (!assertion) {
      throw new Error("Biometric verification was cancelled.");
    }

    const verifiedId = bufferToBase64Url(assertion.rawId);
    return {
      success: true,
      credentialId: verifiedId,
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error("Biometric verification was cancelled.");
    }
    throw new Error(err.message || "Biometric authentication failed.");
  }
}

// Local storage key for fast local device biometric passkey linkage
const LOCAL_BIOMETRIC_KEY = 'ms_local_biometric_cred_id';
const LOCAL_BIOMETRIC_ENABLED = 'ms_local_biometric_enabled';

export function saveLocalBiometricState(enabled: boolean, credentialId?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  if (credentialId) {
    localStorage.setItem(LOCAL_BIOMETRIC_KEY, credentialId);
  } else if (!enabled) {
    localStorage.removeItem(LOCAL_BIOMETRIC_KEY);
  }
}

export function getLocalBiometricState(): { enabled: boolean; credentialId: string | null } {
  if (typeof window === 'undefined') return { enabled: false, credentialId: null };
  const enabled = localStorage.getItem(LOCAL_BIOMETRIC_ENABLED) === 'true';
  const credentialId = localStorage.getItem(LOCAL_BIOMETRIC_KEY);
  return { enabled, credentialId };
}
