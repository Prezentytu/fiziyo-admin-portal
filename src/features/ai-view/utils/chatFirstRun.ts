const MINUTE = 60_000;
const FIRST_SESSION_WINDOW = 5 * MINUTE;
const NEW_ACCOUNT_WINDOW = 24 * 60 * MINUTE;

export function isNewChatAccountSession(accountCreatedAt: Date, sessionCreatedAt: Date, now: number): boolean {
  const accountTime = accountCreatedAt.getTime();
  const sessionTime = sessionCreatedAt.getTime();
  return (
    Math.abs(sessionTime - accountTime) <= FIRST_SESSION_WINDOW &&
    sessionTime <= now &&
    now - accountTime >= 0 &&
    now - accountTime <= NEW_ACCOUNT_WINDOW
  );
}
