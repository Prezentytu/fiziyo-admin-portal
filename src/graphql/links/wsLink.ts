import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient, Client } from "graphql-ws";

/**
 * Factory do tworzenia WebSocket link dla Apollo Client
 * Używa graphql-ws protocol dla GraphQL Subscriptions
 */
export class WsLinkFactory {
  private readonly getToken: () => Promise<string | null>;
  private client: Client | null = null;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  /**
   * Tworzy WebSocket link z automatycznym retry i auth
   */
  create(): GraphQLWsLink {
    // Konwertuj HTTP URL na WebSocket URL
    const httpUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
    const wsUrl = httpUrl.replace(/^http/, "ws") + "/graphql";

    this.client = createClient({
      url: wsUrl,
      // Przekazuj token JWT przy nawiązywaniu połączenia
      connectionParams: async () => {
        const token = await this.getToken();
        if (!token) {
          return {};
        }
        return {
          authorization: `Bearer ${token}`,
        };
      },
      // Retry logic
      shouldRetry: () => true,
      retryAttempts: 5,
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 16000))
        );
      },
      // Obsługa rozłączenia
      on: {
        connected: () => {
          console.log("[WsLink] Connected to GraphQL WebSocket");
        },
        closed: (event) => {
          console.log("[WsLink] WebSocket closed", event);
        },
        error: (error) => {
          console.error("[WsLink] WebSocket error:", error);
        },
      },
      // Lazy connection - połącz tylko gdy potrzebne (subscription)
      lazy: true,
      // Keep-alive ping co 30 sekund
      keepAlive: 30000,
    });

    return new GraphQLWsLink(this.client);
  }

  /**
   * Zamyka połączenie WebSocket (np. przy logout)
   */
  dispose(): void {
    if (this.client) {
      this.client.dispose();
      this.client = null;
    }
  }
}

/**
 * Helper function do tworzenia WebSocket link
 * Użycie: const wsLink = createWsLink(getToken);
 */
export function createWsLink(
  getToken: () => Promise<string | null>
): GraphQLWsLink {
  const factory = new WsLinkFactory(getToken);
  return factory.create();
}
