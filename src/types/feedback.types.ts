/**
 * Typy dla funkcjonalności Feedback
 * Umożliwia użytkownikom zgłaszanie uwag podczas używania aplikacji
 * Adaptacja z aplikacji mobilnej dla wersji webowej
 */

import type { LucideIcon } from 'lucide-react';
import { Bug, Lightbulb, HelpCircle } from 'lucide-react';

/**
 * Typ zgłoszenia - Bug, Sugestia lub Pytanie
 */
export type FeedbackType = 'bug' | 'suggestion' | 'question';

/**
 * Rola użytkownika zgłaszającego feedback
 */
export type FeedbackUserRole = 'patient' | 'physio' | 'company' | 'admin';

/**
 * Konfiguracja typu zgłoszenia - używana w UI
 */
export interface FeedbackTypeConfig {
  type: FeedbackType;
  label: string;
  icon: LucideIcon;
  color: string;
  emoji: string;
}

/**
 * Dane użytkownika zgłaszającego feedback
 */
export interface FeedbackUser {
  userId: string;
  email: string;
  role: FeedbackUserRole;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
}

/**
 * Metadane środowiska
 */
export interface FeedbackMetadata {
  appVersion: string;
  platform: 'web';
  browser: string;
  browserVersion: string;
  timestamp: string;
  screenName?: string;
  url?: string;
  environment?: string;
}

/**
 * Obraz załączony do feedbacku
 */
export interface FeedbackImage {
  file: File;
  preview: string;
}

/**
 * Główny interfejs danych feedbacku
 */
export interface FeedbackData {
  type: FeedbackType;
  description: string;
  images: FeedbackImage[];
  user: FeedbackUser;
  metadata: FeedbackMetadata;
}

/**
 * Payload wysyłany do Discord webhook
 */
export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Discord Embed - formatowana wiadomość
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
}

/**
 * Pole w Discord Embed
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Odpowiedź z wysyłki feedbacku
 */
export interface FeedbackSendResult {
  success: boolean;
  error?: string;
}

/**
 * Konfiguracja typów feedbacku z ikonami Lucide i kolorami
 */
export const FEEDBACK_TYPE_CONFIG: Record<FeedbackType, FeedbackTypeConfig> = {
  bug: {
    type: 'bug',
    label: 'Błąd',
    icon: Bug,
    color: '#EF4444', // red
    emoji: '🐛',
  },
  suggestion: {
    type: 'suggestion',
    label: 'Sugestia',
    icon: Lightbulb,
    color: '#FBBF24', // yellow
    emoji: '💡',
  },
  question: {
    type: 'question',
    label: 'Pytanie',
    icon: HelpCircle,
    color: '#60A5FA', // blue
    emoji: '❓',
  },
};

/**
 * Kolory Discord (decimal) dla embeds
 */
export const DISCORD_COLORS: Record<FeedbackType, number> = {
  bug: 0xef4444, // Red
  suggestion: 0xfbbf24, // Yellow
  question: 0x60a5fa, // Blue
};

