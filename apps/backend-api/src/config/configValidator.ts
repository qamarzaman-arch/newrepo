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

function isWeakSecret(secret: string): boolean {
  if (!secret || secret.length < 32) return true;
  
  // Check against common weak values
  const lowerSecret = secret.toLowerCase();
  for (const weakValue of DEFAULT_INSECURE_VALUES) {
    if (lowerSecret.includes(weakValue.toLowerCase())) {
      return true;
    }
  }
  
  // Check for simple patterns (all same character, sequential numbers, etc.)
  if (/^(.)\1+$/.test(secret)) return true; // All same character
  if (/^[0-9]+$/.test(secret) && secret.length < 16) return true; // Only numbers, too short
  if (/^[a-z]+$/i.test(secret) && secret.length < 12) return true; // Only letters, too short
  
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
  
  // CRITICAL: Database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL is not set. Cannot connect to database.');
  } else {
    // Check for default password
    if (databaseUrl.includes(':password@') || databaseUrl.includes(':root@')) {
      errors.push('DATABASE_URL contains default credentials. Change database password immediately.');
    } else {
      logger.info('✓ DATABASE_URL is configured');
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
  
  // WARNING: CORS Origin
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin === '*') {
    warnings.push('CORS_ORIGIN is set to "*". For production, specify exact domains.');
  } else if (!corsOrigin) {
    warnings.push('CORS_ORIGIN not set. Defaulting to restrictive policy.');
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
  
  // OPTIONAL: Payment Gateway Keys (warn if missing in production)
  if (nodeEnv === 'production') {
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY not set. Payment processing will not work.');
    } else {
      // Stripe keys start with sk_live_ or sk_test_
      if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
        warnings.push('STRIPE_SECRET_KEY appears to be a test key. Use live key for production.');
      } else {
        logger.info('✓ Stripe configured for production');
      }
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
