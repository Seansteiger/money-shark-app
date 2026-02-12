const parseBool = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  return value === 'true' || value === '1';
};

export const config = {
  port: Number(process.env.API_PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'replace-this-access-token-secret-in-production',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'replace-this-refresh-token-secret-in-production',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  secureCookies: parseBool(process.env.SECURE_COOKIES, false),
};
