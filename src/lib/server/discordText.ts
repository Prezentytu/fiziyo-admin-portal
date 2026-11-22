/**
 * User text in Discord webhook messages.
 * `allowed_mentions` disables pings regardless of content; escaping removes links and markdown
 * a report could use to impersonate a portal link in the team channel.
 */
export const DISCORD_NO_MENTIONS = { parse: [] as string[] };

/** Discord rejects the whole message when an embed field value exceeds 1024 characters. */
export const DISCORD_FIELD_LIMIT = 1024;

export function discordText(value: unknown, maxLength = DISCORD_FIELD_LIMIT): string {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value);
  const escaped = text
    .replace(/[\\`*_~|>[\]()]/g, '\\$&')
    .replaceAll('<', '\\<')
    .replaceAll('@', '@​');
  return escaped.length > maxLength ? `${escaped.slice(0, maxLength - 1)}…` : escaped;
}
