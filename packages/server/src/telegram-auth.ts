import { and, eq } from "drizzle-orm";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { getOAuthState } from "better-auth/api";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { telegramOAuthConfig } from "./oauth";

export function telegramAuthPlugin(
  database: NodePgDatabase<typeof schema>,
  env = process.env
) {
  const credentials = telegramOAuthConfig(env);
  if (!credentials) return undefined;
  return genericOAuth({
    config: [
      {
        providerId: "telegram",
        name: "Telegram",
        ...credentials,
        discoveryUrl:
          "https://oauth.telegram.org/.well-known/openid-configuration",
        requireIdTokenVerification: true,
        tokenEndpointAuth: { method: "client_secret_basic" },
        scopes: ["openid", "profile"],
        pkce: true,
        disableSignUp: true,
        overrideUserInfo: false,
        disableProviderLogout: true,
        getUserInfo: async tokens => {
          // Generic OAuth verifies the ID-token signature, issuer, audience, expiry
          // and nonce BEFORE calling this function. Telegram has no userinfo API.
          if (!tokens.idToken) return null;
          const claims = JSON.parse(
            Buffer.from(tokens.idToken.split(".")[1], "base64url").toString(
              "utf8"
            )
          );
          if (typeof claims.sub !== "string" || !claims.sub) return null;
          return claims;
        },
        mapProfileToUser: async profile => {
          const state = await getOAuthState();
          // link is written by Better Auth from the authenticated session, after
          // client additionalData; it is not an email supplied by Telegram/the UI.
          const linkUserId = state?.link?.userId;
          const [local] = linkUserId
            ? await database
                .select()
                .from(schema.authUsers)
                .where(eq(schema.authUsers.id, linkUserId))
                .limit(1)
            : await database
                .select({
                  id: schema.authUsers.id,
                  name: schema.authUsers.name,
                  email: schema.authUsers.email,
                  emailVerified: schema.authUsers.emailVerified,
                })
                .from(schema.authAccounts)
                .innerJoin(
                  schema.authUsers,
                  eq(schema.authUsers.id, schema.authAccounts.userId)
                )
                .where(
                  and(
                    eq(schema.authAccounts.providerId, "telegram"),
                    eq(schema.authAccounts.accountId, String(profile.sub))
                  )
                )
                .limit(1);
          // No fabricated emails, username matching or implicit Telegram signup.
          // Only a verified local identity can connect or use Telegram.
          return {
            email: local?.emailVerified ? local.email : undefined,
            emailVerified: local?.emailVerified ?? false,
            name: local?.name ?? "Telegram",
          };
        },
      },
    ],
  });
}
