export type AICreditRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AICreditRequest {
  id: string;
  requestedCredits: number;
  message: string | null;
  status: AICreditRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  grantedCredits: number | null;
  resolutionNote: string | null;
}

/** Status w schemacie to `String!`: nowa wartość z backendu nie może przejść jako znana. */
export type AICreditRequestPayload = Omit<AICreditRequest, 'status'> & { status: string };

export interface GetAICreditRequestsResponse {
  aiCreditRequests: AICreditRequestPayload[];
}

export interface GetAICreditRequestsVariables {
  organizationId: string;
}

export interface RequestAICreditsResponse {
  requestAICredits: {
    success: boolean;
    message: string | null;
    request: AICreditRequest | null;
  };
}

export interface RequestAICreditsVariables {
  organizationId: string;
  requestedCredits: number;
  message?: string;
}

export interface AICreditsStatus {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  addonCredits: number;
  totalRemaining: number;
  resetDate: string;
}

export interface GetAICreditsStatusResponse {
  aiCreditsStatus: AICreditsStatus;
}

export interface GetAICreditsStatusVariables {
  organizationId: string;
}

/** `kind` i `actionType` w schemacie to `String!`; znaczenie nadaje `summarizeCreditsUsage`. */
export interface AICreditsLogEntry {
  id: string;
  kind: string;
  creditsUsed: number;
  actionType: string;
  createdAt: string;
}

export interface GetAICreditsHistoryResponse {
  aiCreditsHistory: AICreditsLogEntry[];
}

export interface GetAICreditsHistoryVariables {
  organizationId: string;
  days?: number;
}
