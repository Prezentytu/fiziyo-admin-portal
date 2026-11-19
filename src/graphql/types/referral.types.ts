/** Polecenia fizjo (SPEC-054). Enumy jako `string`: nowa wartość z backendu nie wywraca listy. */
export type ReferralSource = 'LINK' | 'EMAIL';
export type ReferralStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';

export interface ReferralProgram {
  code: string;
  confirmed: number;
  active: number;
  pending: number;
}

export interface ReferralView {
  id: string;
  source: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  isActive: boolean;
  referredName: string | null;
  referredEmail: string | null;
}

export interface ReferralRequest {
  id: string;
  referrerName: string;
  referrerOrganizationName: string | null;
  createdAt: string;
}

export interface Referrer {
  name: string;
  confirmedAt: string | null;
}

export interface GetMyReferralProgramResponse {
  myReferralProgram: ReferralProgram;
  myReferrals: ReferralView[];
}

export interface GetMyReferralSideResponse {
  myReferralRequests: ReferralRequest[];
  myReferrer: Referrer | null;
}

export interface GetMyReferralRequestsResponse {
  myReferralRequests: ReferralRequest[];
}

export interface RequestReferralByEmailResponse {
  requestReferralByEmail: ReferralView;
}

export interface ConfirmReferralResponse {
  confirmReferral: Referrer;
}

export interface DeclineReferralResponse {
  declineReferral: boolean;
}
