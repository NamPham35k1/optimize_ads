import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, maskToken } from '../src/utils/encryption.js';

describe('Encryption & Security Unit Tests', () => {
  it('successfully encrypts and decrypts a token with AES-256-GCM', () => {
    const plainToken = 'EAABsbCS1iHgBA...real_meta_access_token_123456789';
    const encrypted = encryptToken(plainToken);

    expect(encrypted).not.toBe(plainToken);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:data

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plainToken);
  });

  it('masks token correctly for safe logging without leaking secret', () => {
    const longToken = 'EAABsbCS1iHgBA999888777';
    const masked = maskToken(longToken);

    expect(masked).toBe('EAABsb...8777');
    expect(masked).not.toContain('999888');
  });

  it('throws on corrupted encrypted string', () => {
    expect(() => decryptToken('corrupted-data')).toThrow();
  });
});
