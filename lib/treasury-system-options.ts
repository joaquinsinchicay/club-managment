export const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;

export type TreasuryAccountVisibility = (typeof TREASURY_ACCOUNT_VISIBILITY_OPTIONS)[number];

export function getEmojiOptions(options: string[], currentEmoji?: string | null) {
  if (currentEmoji && !options.includes(currentEmoji)) {
    return [currentEmoji, ...options];
  }

  return options;
}
