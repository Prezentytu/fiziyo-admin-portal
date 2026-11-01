/**
 * Zaproszenie pacjenta do organizacji (pacjent dołącza po akceptacji w aplikacji).
 */
export interface PatientInvitation {
  id: string;
  organizationId: string;
  email: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface PatientInvitationsData {
  patientInvitations: PatientInvitation[];
}

export interface InvitePatientData {
  invitePatient: PatientInvitation;
}

export interface InvitePatientVariables {
  email: string;
}

export interface RevokePatientInvitationData {
  revokePatientInvitation: boolean;
}

export interface RevokePatientInvitationVariables {
  invitationId: string;
}
