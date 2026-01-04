/**
 * Serwis do wysyłania feedbacku przez backend API
 * Umożliwia użytkownikom aplikacji szybkie zgłaszanie uwag
 *
 * 2025 Pattern:
 * - Feedback wysyłany przez backend (bezpieczniejsze - webhook URL nie jest exposowany)
 * - Backend obsługuje Discord webhook
 * - Rate limiting na froncie + backendzie
 */

import type { FeedbackData, FeedbackSendResult, FeedbackMetadata } from "@/types/feedback.types";

// ============================================================================
// CONFIG
// ============================================================================

// Używamy lokalnego Next.js API route - omija CORS i daje fallback na Discord
const API_FEEDBACK_ENDPOINT = "/api/feedback";

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limiting - max 1 zgłoszenie na 30 sekund
 */
let lastFeedbackTime = 0;
const RATE_LIMIT_MS = 30000; // 30 sekund

/**
 * Sprawdza czy rate limit pozwala na wysłanie
 */
function canSendFeedback(): boolean {
  const now = Date.now();
  return now - lastFeedbackTime >= RATE_LIMIT_MS;
}

/**
 * Aktualizuje timestamp ostatniego wysłanego feedbacku
 */
function updateLastFeedbackTime(): void {
  lastFeedbackTime = Date.now();
}

// ============================================================================
// METADATA HELPERS
// ============================================================================

/**
 * Pobiera wersję aplikacji z package.json (ustawiona w build time)
 */
function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
}

/**
 * Pobiera informacje o przeglądarce
 */
function getBrowserInfo(): { name: string; version: string } {
  if (typeof globalThis.window === "undefined") {
    return { name: "SSR", version: "0" };
  }

  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "0";

  if (ua.includes("Firefox/")) {
    name = "Firefox";
    version = ua.split("Firefox/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    name = "Chrome";
    version = ua.split("Chrome/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Edg/")) {
    name = "Edge";
    version = ua.split("Edg/")[1]?.split(" ")[0] || "0";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    name = "Safari";
    version = ua.split("Version/")[1]?.split(" ")[0] || "0";
  }

  return { name, version };
}

/**
 * Pobiera środowisko (prod/dev/staging)
 */
function getEnvironment(): string {
  return process.env.NEXT_PUBLIC_ENVIRONMENT || "development";
}

/**
 * Tworzy obiekt metadanych feedbacku
 */
export function createFeedbackMetadata(screenName?: string): FeedbackMetadata {
  const browser = getBrowserInfo();

  return {
    appVersion: getAppVersion(),
    platform: "web",
    browser: browser.name,
    browserVersion: browser.version,
    timestamp: new Date().toISOString(),
    screenName,
    url: typeof globalThis.window !== "undefined" ? globalThis.location.href : undefined,
    environment: getEnvironment(),
  };
}

/**
 * Konwertuje plik na base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Wysyła feedback przez backend API
 */
export async function sendFeedbackToDiscord(feedback: FeedbackData): Promise<FeedbackSendResult> {
  // Rate limiting
  if (!canSendFeedback()) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastFeedbackTime)) / 1000);
    return {
      success: false,
      error: `Poczekaj ${remainingSeconds} sekund przed wysłaniem kolejnego zgłoszenia`,
    };
  }

  try {
    const browser = getBrowserInfo();

    // Konwertuj zdjęcia na base64
    const imagesBase64: string[] = [];
    for (const img of feedback.images) {
      try {
        const base64 = await fileToBase64(img.file);
        imagesBase64.push(base64);
      } catch (err) {
        console.warn("[FeedbackService] Failed to convert image to base64:", err);
      }
    }

    // Przygotuj payload dla backendu
    const payload = {
      type: feedback.type,
      description: feedback.description,
      screenName: feedback.metadata.screenName,
      url: feedback.metadata.url,
      appVersion: feedback.metadata.appVersion,
      browser: `${browser.name} ${browser.version}`,
      environment: getEnvironment(),
      userId: feedback.user.userId,
      userEmail: feedback.user.email,
      userName: feedback.user.firstName
        ? `${feedback.user.firstName} ${feedback.user.lastName || ""}`.trim()
        : undefined,
      userRole: feedback.user.role,
      organizationId: feedback.user.organizationId,
      images: imagesBase64,
    };

    // Wyślij przez lokalne API route (proxy do backendu z fallback na Discord)
    const response = await fetch(API_FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      updateLastFeedbackTime();
      console.log("[FeedbackService] Feedback sent successfully via backend");
      return { success: true };
    } else {
      console.error("[FeedbackService] Backend error:", result);
      return {
        success: false,
        error: result.message || `Błąd serwera: ${response.status}`,
      };
    }
  } catch (error) {
    console.error("[FeedbackService] Error sending feedback:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nieznany błąd podczas wysyłania",
    };
  }
}
