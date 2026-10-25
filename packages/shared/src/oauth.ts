export function oauthErrorMessage(
  error: string | null,
  provider?: string | null
) {
  if (!error) return "";
  if (provider === "telegram") {
    if (
      ["email_not_found", "signup_disabled", "unable_to_link_account"].includes(
        error
      )
    )
      return "Sign in with email or Google first, then connect Telegram in your profile. Your account email must be verified.";
    return "Unable to sign in with Telegram. Please try again.";
  }
  if (error === "account_not_linked")
    return "Verify your account email before signing in with Google, or use your password.";
  if (error === "signup_disabled")
    return "Use an existing administrator account to sign in.";
  return "Unable to sign in with Google. Please try again.";
}
