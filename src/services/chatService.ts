import { getBackendToken } from "@/lib/tokenCache";
import type { ChatQuestionRequest, ChatDataContainer } from "@/types/chat.types";

const isDev = process.env.NODE_ENV === "development";

/**
 * Serwis do komunikacji z AI Chat API
 * Używa REST endpoint /api/chat/simple
 */
class ChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  }

  /**
   * Wysyła pytanie do AI i otrzymuje odpowiedź
   * @param question - Treść pytania
   * @param sessionId - Opcjonalne ID sesji (dla kontynuacji rozmowy)
   * @returns Odpowiedź z AI
   */
  async sendMessage(
    question: string,
    sessionId?: string
  ): Promise<ChatDataContainer> {
    const url = `${this.baseUrl}/api/chat/simple`;

    // Pobierz token z cache
    const token = getBackendToken();

    if (!token) {
      throw new Error("Brak tokenu autoryzacji. Zaloguj się ponownie.");
    }

    try {
      const request: ChatQuestionRequest = {
        question,
        sessionId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesja wygasła. Odśwież stronę i spróbuj ponownie.");
        }
        const errorText = await response.text();
        throw new Error(
          `Błąd komunikacji z AI: ${response.status} - ${errorText}`
        );
      }

      const data: ChatDataContainer = await response.json();

      if (isDev) {
        console.log("[ChatService] Odpowiedź AI:", {
          sessionId: data.sessionId,
          responseLength: data.response?.response?.length,
          usage: data.usage,
        });
      }

      return data;
    } catch (error) {
      if (isDev) {
        console.error("[ChatService] Błąd wysyłania wiadomości:", error);
      }
      throw error;
    }
  }
}

// Singleton instance
export const chatService = new ChatService();





