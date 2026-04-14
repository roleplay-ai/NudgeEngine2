import { createClient } from '@supabase/supabase-js';

/**
 * IMPORTANT: This client uses the service-role key.
 * It MUST only ever be used in Server Actions, API Routes, or Edge Functions.
 * NEVER import this on the client side.
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Generate a secure random password: 12 chars, mixed case, numbers, symbols.
 */
export function generatePassword(): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const syms   = '!@#$%&';

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const parts = [
    pick(upper), pick(upper),
    pick(lower), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(digits),
    pick(syms),
  ];

  // Fill remaining chars
  const all = upper + lower + digits + syms;
  while (parts.length < 12) parts.push(pick(all));

  // Shuffle
  return parts.sort(() => Math.random() - 0.5).join('');
}

/**
 * Simple XOR-based obfuscation for stored passwords.
 * NOT true encryption — use a proper secrets manager for production.
 * The plain password needs to be retrievable for SendGrid credential emails.
 * For Phase 1 this is acceptable; upgrade to proper envelope encryption (AES-256-GCM)
 * using a KMS key before going to production.
 */
export function obfuscatePassword(plain: string): string {
  const key = process.env.PASSWORD_OBFUSCATION_KEY ?? 'nudgeable-default-key';
  let result = '';
  for (let i = 0; i < plain.length; i++) {
    result += String.fromCharCode(
      plain.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(result, 'binary').toString('base64');
}

export function deobfuscatePassword(encoded: string): string {
  const key = process.env.PASSWORD_OBFUSCATION_KEY ?? 'nudgeable-default-key';
  const raw = Buffer.from(encoded, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    result += String.fromCharCode(
      raw.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}
