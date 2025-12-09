import { gql } from "@apollo/client";

/**
 * ============================================================================
 * UWAGA: Wszystkie mutations w tym pliku są NIEAKTYWNE
 *
 * Schema backendu nie zawiera żadnych mutations dla appointments.
 * Plik zachowany dla kompatybilności wstecznej i przyszłej implementacji.
 *
 * TODO: Czeka na implementację w backendzie
 * ============================================================================
 */

/**
 * Mutacja do tworzenia nowej wizyty
 * @deprecated Nie istnieje w schemacie - czeka na implementację
 */
export const CREATE_APPOINTMENT_MUTATION = gql`
  mutation CreateAppointment(
    $patientId: String!
    $therapistId: String!
    $clinicId: String!
    $organizationId: String!
    $date: DateTime!
    $duration: Int!
    $status: String!
    $title: String
    $description: String
  ) {
    createAppointment(
      patientId: $patientId
      therapistId: $therapistId
      clinicId: $clinicId
      organizationId: $organizationId
      date: $date
      duration: $duration
      status: $status
      title: $title
      description: $description
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
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Mutacja do aktualizacji statusu wizyty
 */
export const UPDATE_APPOINTMENT_STATUS_MUTATION = gql`
  mutation UpdateAppointmentStatus($appointmentId: String!, $status: String!) {
    updateAppointmentStatus(appointmentId: $appointmentId, status: $status)
  }
`;

/**
 * Mutacja do zmiany terminu wizyty
 */
export const RESCHEDULE_APPOINTMENT_MUTATION = gql`
  mutation RescheduleAppointment($appointmentId: String!, $date: DateTime!, $duration: Int) {
    rescheduleAppointment(appointmentId: $appointmentId, date: $date, duration: $duration)
  }
`;

/**
 * Mutacja do tworzenia prośby o wizytę przez pacjenta
 */
export const REQUEST_APPOINTMENT_MUTATION = gql`
  mutation RequestAppointment(
    $patientId: String!
    $therapistId: String!
    $clinicId: String!
    $organizationId: String!
    $date: DateTime!
    $duration: Int!
    $preferredTime: String
    $description: String
  ) {
    requestAppointment(
      patientId: $patientId
      therapistId: $therapistId
      clinicId: $clinicId
      organizationId: $organizationId
      date: $date
      duration: $duration
      preferredTime: $preferredTime
      description: $description
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
      createdAt
      createdById
      updatedAt
    }
  }
`;

/**
 * Mutacja do potwierdzania prośby o wizytę przez fizjoterapeutę
 */
export const CONFIRM_APPOINTMENT_MUTATION = gql`
  mutation ConfirmAppointment($appointmentId: String!, $date: DateTime, $duration: Int, $notes: String) {
    confirmAppointment(appointmentId: $appointmentId, date: $date, duration: $duration, notes: $notes)
  }
`;

/**
 * Mutacja do odrzucania prośby o wizytę przez fizjoterapeutę
 */
export const REJECT_APPOINTMENT_MUTATION = gql`
  mutation RejectAppointment($appointmentId: String!, $reason: String) {
    rejectAppointment(appointmentId: $appointmentId, reason: $reason)
  }
`;

/**
 * Mutacja do anulowania wizyty
 */
export const CANCEL_APPOINTMENT_MUTATION = gql`
  mutation CancelAppointment($appointmentId: String!, $reason: String) {
    cancelAppointment(appointmentId: $appointmentId, reason: $reason)
  }
`;

/**
 * Mutacja do zakończenia wizyty
 */
export const COMPLETE_APPOINTMENT_MUTATION = gql`
  mutation CompleteAppointment($appointmentId: String!, $notes: String) {
    completeAppointment(appointmentId: $appointmentId, notes: $notes)
  }
`;

/**
 * Mutacja do usuwania wizyty
 */
export const DELETE_APPOINTMENT_MUTATION = gql`
  mutation DeleteAppointment($appointmentId: String!) {
    deleteAppointment(appointmentId: $appointmentId)
  }
`;
