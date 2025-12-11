// Web version of URL config (no react-native)

// Interface zgodny z Dependency Inversion Principle
export interface IUrlConfig {
  getGraphQLEndpoint(): string;
  getBaseUrl(): string;
}

// Default implementation for web
export class WebUrlConfig implements IUrlConfig {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const url = baseUrl || process.env.NEXT_PUBLIC_API_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_API_URL environment variable is required");
    }
    this.baseUrl = url;
  }

  getGraphQLEndpoint(): string {
    return `${this.baseUrl}/graphql`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export default instance
export const urlConfig = new WebUrlConfig();
