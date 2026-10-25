/** Server-only OAuth settings. Never pass credentials to client components. */
function credentialsFor(
  provider: "GOOGLE" | "TELEGRAM",
  env: NodeJS.ProcessEnv
) {
  const site = env.MARKETPLACE_SITE === "admin" ? "ADMIN" : "CUSTOMER";
  const siteId = env[`${site}_${provider}_CLIENT_ID`];
  const siteSecret = env[`${site}_${provider}_CLIENT_SECRET`];
  const overridden = siteId !== undefined || siteSecret !== undefined;
  const clientId = overridden ? siteId : env[`${provider}_CLIENT_ID`];
  const clientSecret = overridden
    ? siteSecret
    : env[`${provider}_CLIENT_SECRET`];
  if (!clientId?.trim() || !clientSecret?.trim()) return undefined;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

export function googleOAuthConfig(env = process.env) {
  const site = env.MARKETPLACE_SITE === "admin" ? "ADMIN" : "CUSTOMER";
  const credentials = credentialsFor("GOOGLE", env);
  if (!credentials) return undefined;
  return {
    ...credentials,
    disableSignUp: site === "ADMIN",
    requireEmailVerification: true,
    prompt: "select_account" as const,
  };
}

export function isGoogleOAuthEnabled() {
  return Boolean(
    googleOAuthConfig({
      ...process.env,
      MARKETPLACE_SITE:
        process.env.NEXT_PUBLIC_MARKETPLACE_SITE ??
        process.env.MARKETPLACE_SITE,
    })
  );
}

export function telegramOAuthConfig(env = process.env) {
  return credentialsFor("TELEGRAM", env);
}

export function isTelegramOAuthEnabled() {
  return Boolean(
    telegramOAuthConfig({
      ...process.env,
      MARKETPLACE_SITE:
        process.env.NEXT_PUBLIC_MARKETPLACE_SITE ??
        process.env.MARKETPLACE_SITE,
    })
  );
}
