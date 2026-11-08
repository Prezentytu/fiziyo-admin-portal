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
