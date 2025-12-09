import { gql } from "@apollo/client";

/**
 * ============================================================================
 * UWAGA: Wszystkie queries w tym pliku są NIEAKTYWNE
 * 
 * Schema backendu nie zawiera żadnych queries dla appointments.
 * Plik zachowany dla kompatybilności wstecznej i przyszłej implementacji.
 * 
 * TODO: Czeka na implementację w backendzie
 * ============================================================================
 */

/**
 * Query do pobierania listy wizyt
 * Wspiera filtrowanie, sortowanie i projekcję
 * @deprecated Nie istnieje w schemacie - czeka na implementację
 */
export const GET_APPOINTMENTS_QUERY = gql`
  query GetAppointments($where: AppointmentFilterInput, $order: [AppointmentSortInput!]) {
    appointments(where: $where, order: $order) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania pojedynczej wizyty po ID
 */
export const GET_APPOINTMENT_BY_ID_QUERY = gql`
  query GetAppointmentById($id: String!) {
    appointments(where: { id: { eq: $id } }) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania wizyt pacjenta
 */
export const GET_PATIENT_APPOINTMENTS_QUERY = gql`
  query GetPatientAppointments($patientId: String!) {
    appointments(where: { patientId: { eq: $patientId } }) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania wizyt fizjoterapeuty
 */
export const GET_THERAPIST_APPOINTMENTS_QUERY = gql`
  query GetTherapistAppointments($therapistId: String!) {
    appointments(where: { therapistId: { eq: $therapistId } }) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania wizyt organizacji
 */
export const GET_ORGANIZATION_APPOINTMENTS_QUERY = gql`
  query GetOrganizationAppointments($organizationId: String!) {
    appointments(where: { organizationId: { eq: $organizationId } }) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania wizyt w określonym statusie
 */
export const GET_APPOINTMENTS_BY_STATUS_QUERY = gql`
  query GetAppointmentsByStatus($status: String!, $organizationId: String!) {
    appointments(where: { status: { eq: $status }, organizationId: { eq: $organizationId } }) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Query do pobierania nadchodzących wizyt
 */
export const GET_UPCOMING_APPOINTMENTS_QUERY = gql`
  query GetUpcomingAppointments($date: DateTime!, $organizationId: String!) {
    appointments(
      where: { date: { gte: $date }, organizationId: { eq: $organizationId }, status: { neq: "canceled" } }
      order: { date: ASC }
    ) {
      id
      patientId
      therapistId
      clinicId
      organizationId
      date
      duration
      status
      title
      description
      preferredTime
      reminderSent
      createdAt
      createdById
      updatedAt
    }
  }
`;
