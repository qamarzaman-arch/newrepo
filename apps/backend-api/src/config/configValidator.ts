import { logger } from '../utils/logger';

/**
 * Configuration Validator
 * Ensures critical environment variables are set and secure before startup
 * Prevents deployment with insecure default configurations
 */

interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_INSECURE_VALUES = [
  'your-super-secret-jwt-key-change-this-in-production',
  'changeme',
  'password',
  'secret',
  'admin',
  '123456',
  'qwerty',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'test',
  'demo',
];

/**
 * Shannon entropy in bits per character. Random data hovers around 5.0+;
 * a string like "aaaaaaaa..." or "abababab..." sits well below 4.
 */
function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function isWeakSecret(secret: string): boolean {
  if (!secret || secret.length < 32) return true;

  const lowerSecret = secret.toLowerCase();
  for (const weakValue of DEFAULT_INSECURE_VALUES) {
    if (lowerSecret.includes(weakValue.toLowerCase())) return true;
  }

  if (/^(.)\1+$/.test(secret)) return true;
  if (/^[0-9]+$/.test(secret) && secret.length < 16) return true;
  if (/^[a-z]+$/i.test(secret) && secret.length < 12) return true;

  // QA D41: entropy gate. 32 chars of "aaa...bbb..." passes the length test
  // but is trivially guessable.
  if (shannonEntropy(secret) < 4) return true;

  return false;
}

export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  logger.info('Validating configuration...');
  
  // CRITICAL: JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set. Generate a secure random key (min 32 characters).');
  } else if (isWeakSecret(jwtSecret)) {
    errors.push('JWT_SECRET is too weak or contains default value. Must be 32+ random characters.');
  } else {
    logger.info('✓ JWT_SECRET is configured');
  }
  
  // CRITICAL: Database URL — actually parse it (QA D42).
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL is not set. Cannot connect to database.');
  } else {
    try {
      const u = new URL(databaseUrl);
      if (!['mysql:', 'mariadb:', 'postgres:', 'postgresql:'].includes(u.protocol)) {
        errors.push(`DATABASE_URL has unexpected protocol "${u.protocol}". Expected mysql:// or postgres://.`);
      }
      if (!u.hostname) errors.push('DATABASE_URL has no host');
      if (!u.pathname || u.pathname === '/') errors.push('DATABASE_URL has no database name');
      if (u.password === 'password' || u.password === 'root' || u.password === '') {
        errors.push('DATABASE_URL contains a default/empty password. Change it.');
      }
      if (!errors.some((e) => e.startsWith('DATABASE_URL'))) {
        logger.info('✓ DATABASE_URL is configured');
      }
    } catch {
      errors.push('DATABASE_URL is not a valid URL.');
    }
  }
  
  // CRITICAL: Port
  const port = process.env.PORT;
  if (!port) {
    warnings.push('PORT not set, defaulting to 3001');
  } else {
    const portNum = parseInt(port, 10);
    if (portNum < 1024 && process.platform !== 'win32') {
      warnings.push(`PORT ${portNum} requires root privileges. Consider using port > 1024.`);
    }
    if (portNum === 3000 || portNum === 3001) {
      warnings.push(`Using common development port ${portNum}. Ensure firewall is configured for production.`);
    }
  }
  
  // CORS Origin — fail-closed in prod (QA D43).
  const corsOrigin = process.env.CORS_ORIGIN;
  const isProdNow = process.env.NODE_ENV === 'production';
  if (corsOrigin === '*') {
    if (isProdNow) {
      errors.push('CORS_ORIGIN cannot be "*" in production. Specify exact origins.');
    } else {
      warnings.push('CORS_ORIGIN is "*". OK for dev only.');
    }
  } else if (!corsOrigin) {
    if (isProdNow) {
      errors.push('CORS_ORIGIN is required in production.');
    } else {
      warnings.push('CORS_ORIGIN not set.');
    }
  } else {
    logger.info('✓ CORS_ORIGIN is configured');
  }
  
  // WARNING: Node Environment
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push('NODE_ENV not set. Defaulting to "development". Set to "production" for deployment.');
  } else if (nodeEnv === 'production') {
    logger.info('✓ Running in production mode');
  } else {
    warnings.push(`Running in ${nodeEnv} mode. Ensure this is intentional.`);
  }
  
  // OPTIONAL: Payment Gateway Keys — QA D44, format + length checks.
  if (nodeEnv === 'production') {
    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      warnings.push('STRIPE_SECRET_KEY not set. Payment processing will not work.');
    } else if (!/^sk_(live|test)_[a-zA-Z0-9]{16,}$/.test(sk)) {
      errors.push('STRIPE_SECRET_KEY does not match the expected sk_live_/sk_test_ format and length.');
    } else if (!sk.startsWith('sk_live_')) {
      warnings.push('STRIPE_SECRET_KEY appears to be a test key. Use live key for production.');
    } else {
      logger.info('✓ Stripe configured for production');
    }

    const wh = process.env.STRIPE_WEBHOOK_SECRET;
    if (sk && !wh) {
      errors.push('STRIPE_WEBHOOK_SECRET is required when Stripe is enabled (the webhook route refuses requests otherwise).');
    } else if (wh && !wh.startsWith('whsec_')) {
      errors.push('STRIPE_WEBHOOK_SECRET should start with "whsec_".');
    }
  }

  // QA A8: HTTPS enforcement in production.
  if (nodeEnv === 'production') {
    const trustProxy = process.env.TRUST_PROXY;
    const forceHttps = process.env.FORCE_HTTPS;
    if (!trustProxy || !forceHttps) {
      warnings.push('Production deployment should set TRUST_PROXY and FORCE_HTTPS=true so JWTs are not sent over HTTP.');
    }
  }
  
  // OPTIONAL: Rate Limiting Config
  const rateLimitMs = process.env.RATE_LIMIT_WINDOW_MS;
  const rateLimitMax = process.env.RATE_LIMIT_MAX_REQUESTS;
  if (rateLimitMs && parseInt(rateLimitMs, 10) > 15 * 60 * 1000) {
    warnings.push('RATE_LIMIT_WINDOW_MS is very high. Consider shorter windows for security.');
  }
  if (rateLimitMax && parseInt(rateLimitMax, 10) > 1000) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS is very high. Consider lower limits for auth endpoints.');
  }
  
  const valid = errors.length === 0;
  
  if (valid) {
    logger.info('✓ Configuration validation passed');
  } else {
    logger.error('✗ Configuration validation failed');
    errors.forEach(err => logger.error(`  - ${err}`));
  }
  
  if (warnings.length > 0) {
    logger.warn(`Configuration warnings (${warnings.length}):`);
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }
  
  return { valid, errors, warnings };
}

/**
 * Validate configuration and exit if critical errors found
 * Call this during application startup before any routes are registered
 */
export function validateAndExitIfInvalid(): void {
  const result = validateConfig();
  
  if (!result.valid) {
    logger.error('Critical configuration errors detected. Application cannot start safely.');
    logger.error('Please fix the following errors:');
    result.errors.forEach(err => logger.error(`  - ${err}`));
    process.exit(1);
  }
}
