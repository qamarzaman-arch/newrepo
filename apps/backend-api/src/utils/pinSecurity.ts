import bcrypt from 'bcryptjs';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export const isBcryptHash = (value?: string | null) =>
  Boolean(value && BCRYPT_HASH_PATTERN.test(value));

export const verifyAndUpgradeSecret = async (
  providedSecret: string,
  storedSecret: string | null | undefined,
  upgradeSecret: (hashedSecret: string) => Promise<void>
) => {
  if (!storedSecret) {
    return false;
  }

  if (isBcryptHash(storedSecret)) {
    return bcrypt.compare(providedSecret, storedSecret);
  }

  if (providedSecret !== storedSecret) {
    return false;
  }

  const hashedSecret = await bcrypt.hash(providedSecret, 12);
  await upgradeSecret(hashedSecret);
  return true;
};
