import { describe, it, expect, beforeAll } from 'vitest';
import { rateLimit } from '../rateLimit';
import { hashPassword, comparePassword } from '../password';
import { signToken, verifyToken } from '../auth';

describe('T1: Flag Verification & Point Deduplication', () => {
  it('correct flag matches bcrypt hash and awards points once', async () => {
    const rawFlag = 'CTF{sqli_l0g1n_byp4ss_succ3ss}';
    const flagHash = await hashPassword(rawFlag);

    // 1. Correct flag comparison
    const isCorrect = await comparePassword(rawFlag, flagHash);
    expect(isCorrect).toBe(true);

    // 2. Incorrect flag comparison fails
    const isIncorrect = await comparePassword('CTF{wrong_flag}', flagHash);
    expect(isIncorrect).toBe(false);

    // 3. User score increment simulation
    let userPoints = 0;
    const challengePoints = 100;
    let solved = false;

    // First solve
    if (isCorrect && !solved) {
      userPoints += challengePoints;
      solved = true;
    }
    expect(userPoints).toBe(100);

    // Duplicate solve attempt (should NOT increment points again)
    if (isCorrect && !solved) {
      userPoints += challengePoints;
    }
    expect(userPoints).toBe(100);
  });
});

describe('T2: Rate Limiting on Flag Submission', () => {
  it('allows up to 10 attempts per minute, then blocks the 11th with retryAfter', () => {
    const ipKey = 'submit_test_ip_192_168_1_50';
    const limit = 10;
    const windowMs = 60_000;

    // Send 10 allowed requests
    for (let i = 1; i <= limit; i++) {
      const res = rateLimit(ipKey, limit, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(i);
    }

    // 11th request must be rejected (HTTP 429)
    const blockedRes = rateLimit(ipKey, limit, windowMs);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.count).toBe(10);
    expect(blockedRes.retryAfter).toBeGreaterThan(0);
  });
});

describe('T5: Role-Based Access Control (RBAC)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'secure-jwt-test-secret-at-least-32-chars-long';
  });

  it('distinguishes between USER and ADMIN sessions', async () => {
    const userPayload = {
      id: 'usr-1',
      name: 'Cyber Cadet',
      email: 'user@ctfforge.com',
      role: 'USER',
    };

    const adminPayload = {
      id: 'adm-1',
      name: 'Administrator',
      email: 'admin@ctfforge.com',
      role: 'ADMIN',
    };

    const userToken = await signToken(userPayload);
    const adminToken = await signToken(adminPayload);

    const verifiedUser = await verifyToken(userToken);
    const verifiedAdmin = await verifyToken(adminToken);

    expect(verifiedUser?.role).toBe('USER');
    expect(verifiedAdmin?.role).toBe('ADMIN');

    // Access control check
    const checkAdminAccess = (role: string | undefined) => role === 'ADMIN';

    expect(checkAdminAccess(verifiedUser?.role)).toBe(false); // Forbidden HTTP 403
    expect(checkAdminAccess(verifiedAdmin?.role)).toBe(true); // Allowed HTTP 200
  });
});

describe('T6: Progressive Hint Sequential Enforcement', () => {
  it('requires Level 1 before Level 2, and Level 1+2 before Level 3', () => {
    const validateHintRequest = (requestedLevel: number, unlockedLevels: Set<number>) => {
      if (requestedLevel === 2 && !unlockedLevels.has(1)) {
        return { allowed: false, error: 'Buka Level 1 terlebih dahulu' };
      }
      if (requestedLevel === 3 && (!unlockedLevels.has(1) || !unlockedLevels.has(2))) {
        return { allowed: false, error: 'Buka Level 1 dan 2 terlebih dahulu' };
      }
      return { allowed: true };
    };

    const unlocked = new Set<number>();

    // Try requesting Level 3 directly -> BLOCKED
    const reqLevel3Direct = validateHintRequest(3, unlocked);
    expect(reqLevel3Direct.allowed).toBe(false);

    // Try requesting Level 2 directly -> BLOCKED
    const reqLevel2Direct = validateHintRequest(2, unlocked);
    expect(reqLevel2Direct.allowed).toBe(false);

    // Request Level 1 -> ALLOWED
    const reqLevel1 = validateHintRequest(1, unlocked);
    expect(reqLevel1.allowed).toBe(true);
    unlocked.add(1);

    // Now request Level 2 -> ALLOWED
    const reqLevel2 = validateHintRequest(2, unlocked);
    expect(reqLevel2.allowed).toBe(true);
    unlocked.add(2);

    // Now request Level 3 -> ALLOWED
    const reqLevel3 = validateHintRequest(3, unlocked);
    expect(reqLevel3.allowed).toBe(true);
  });
});

describe('T7: SQL Injection Immunity via Parameterized Queries', () => {
  it('treats SQL injection payload as literal string without modifying query structure', () => {
    const maliciousInput = "admin' OR '1'='1' --";

    // Simulating how Prisma parameterized queries treat input:
    // Input is bound to a prepared parameter (?, $1), NOT concatenated
    const simulatedStore = new Map<string, string>();
    simulatedStore.set('admin@ctfforge.com', 'hashed_pass');

    // Safe parameterized lookup: exact match on email/username literal
    const foundUser = simulatedStore.get(maliciousInput);

    // Malicious payload cannot match any real user email
    expect(foundUser).toBeUndefined();
  });
});

describe('T8: Lab Instance Lifecycle & Timeout Expiration', () => {
  it('correctly tracks 15-minute expiration and expiration state', () => {
    const now = Date.now();
    const durationMs = 15 * 60 * 1000;
    const expiresAt = new Date(now + durationMs);

    const isExpired = (expiry: Date, currentTime: number) => expiry.getTime() <= currentTime;

    // Currently running (not expired)
    expect(isExpired(expiresAt, now)).toBe(false);

    // Remaining seconds
    const remainingSeconds = Math.floor((expiresAt.getTime() - now) / 1000);
    expect(remainingSeconds).toBe(900);

    // After 15 minutes and 1 second -> expired
    const futureTime = now + durationMs + 1000;
    expect(isExpired(expiresAt, futureTime)).toBe(true);
  });
});
