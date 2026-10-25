import { describe, expect, it } from "vitest";
import {
  googleOAuthConfig,
  telegramOAuthConfig,
} from "@marketplace/server/oauth";
import { oauthErrorMessage } from "@marketplace/shared/oauth";

describe("Google OAuth configuration", () => {
  it("requires both credentials and never enables an incomplete provider", () => {
    expect(googleOAuthConfig({})).toBeUndefined();
    expect(googleOAuthConfig({ GOOGLE_CLIENT_ID: "id" })).toBeUndefined();
    expect(
      googleOAuthConfig({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: " " })
    ).toBeUndefined();
  });
  it("allows customer registration but blocks admin registration", () => {
    const env = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };
    expect(googleOAuthConfig(env)?.disableSignUp).toBe(false);
    expect(
      googleOAuthConfig({ ...env, MARKETPLACE_SITE: "admin" })?.disableSignUp
    ).toBe(true);
    expect(googleOAuthConfig(env)?.requireEmailVerification).toBe(true);
  });
  it("isolates site credentials and permits explicitly disabling a site", () => {
    const env = {
      GOOGLE_CLIENT_ID: "shared",
      GOOGLE_CLIENT_SECRET: "shared-secret",
      ADMIN_GOOGLE_CLIENT_ID: "admin",
      ADMIN_GOOGLE_CLIENT_SECRET: "admin-secret",
    };
    expect(googleOAuthConfig(env)?.clientId).toBe("shared");
    expect(
      googleOAuthConfig({ ...env, MARKETPLACE_SITE: "admin" })?.clientId
    ).toBe("admin");
    expect(
      googleOAuthConfig({
        ...env,
        MARKETPLACE_SITE: "admin",
        ADMIN_GOOGLE_CLIENT_SECRET: "",
      })
    ).toBeUndefined();
  });
  it("maps callback errors to safe messages instead of echoing URL content", () => {
    expect(oauthErrorMessage(null)).toBe("");
    expect(oauthErrorMessage("account_not_linked")).toContain(
      "Verify your account email"
    );
    expect(oauthErrorMessage("signup_disabled")).toContain(
      "administrator account"
    );
    expect(oauthErrorMessage("<script>untrusted</script>")).toBe(
      "Unable to sign in with Google. Please try again."
    );
    expect(oauthErrorMessage("email_not_found", "telegram")).toContain(
      "connect Telegram in your profile"
    );
    expect(oauthErrorMessage("access_denied", "telegram")).toBe(
      "Unable to sign in with Telegram. Please try again."
    );
  });
  it("requires complete site-specific pairs instead of mixing clients", () => {
    expect(
      googleOAuthConfig({
        GOOGLE_CLIENT_ID: "shared",
        GOOGLE_CLIENT_SECRET: "secret",
        ADMIN_GOOGLE_CLIENT_ID: "admin-only",
        MARKETPLACE_SITE: "admin",
      })
    ).toBeUndefined();
    expect(
      telegramOAuthConfig({
        TELEGRAM_CLIENT_ID: "123",
        TELEGRAM_CLIENT_SECRET: "secret",
      })?.clientId
    ).toBe("123");
    expect(telegramOAuthConfig({ TELEGRAM_CLIENT_ID: "123" })).toBeUndefined();
    expect(
      telegramOAuthConfig({
        TELEGRAM_CLIENT_ID: "123",
        TELEGRAM_CLIENT_SECRET: "secret",
        CUSTOMER_TELEGRAM_CLIENT_ID: "456",
      })
    ).toBeUndefined();
  });
});
