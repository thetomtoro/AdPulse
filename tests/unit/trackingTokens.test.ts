import { describe, it, expect } from 'vitest';
import { createTrackingToken, verifyTrackingToken } from '../../src/services/events/trackingTokens.js';
import type { TrackingPayload } from '../../src/shared/types.js';

const SECRET = 'test-secret-at-least-16-chars';

function samplePayload(): TrackingPayload {
  return {
    rid: 'req_123',
    cid: 'cmp_456',
    crt: 'crt_789',
    pid: 'pub_abc',
    uid: 'usr_def',
    ts: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1h expiry
  };
}

describe('trackingTokens', () => {
  it('creates and verifies a token round-trip', () => {
    const payload = samplePayload();
    const token = createTrackingToken(payload, SECRET);
    const verified = verifyTrackingToken(token, SECRET);

    expect(verified).not.toBeNull();
    expect(verified!.rid).toBe(payload.rid);
    expect(verified!.cid).toBe(payload.cid);
    expect(verified!.crt).toBe(payload.crt);
  });

  it('rejects tampered token', () => {
    const token = createTrackingToken(samplePayload(), SECRET);
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(verifyTrackingToken(tampered, SECRET)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const token = createTrackingToken(samplePayload(), SECRET);
    expect(verifyTrackingToken(token, 'wrong-secret-definitely')).toBeNull();
  });

  it('rejects expired token', () => {
    const payload = samplePayload();
    payload.exp = Math.floor(Date.now() / 1000) - 60; // expired 1 min ago
    const token = createTrackingToken(payload, SECRET);
    expect(verifyTrackingToken(token, SECRET)).toBeNull();
  });
});
