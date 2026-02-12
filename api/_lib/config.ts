const requireEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  return value === 'true' || value === '1';
};

export const config = {
  accessTokenSecret: requireEnv('ACCESS_TOKEN_SECRET'),
  refreshTokenSecret: requireEnv('REFRESH_TOKEN_SECRET'),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  secureCookies: parseBool(process.env.SECURE_COOKIES, true),
};
