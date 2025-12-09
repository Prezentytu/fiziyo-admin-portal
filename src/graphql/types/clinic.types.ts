export interface ClinicPatient {
  id: string;
  fullname: string;
  email?: string;
}

export interface AssignPatientsResult {
  assigned: number;
}

export interface RemovePatientsResult {
  removed: number;
}

export interface AssignPatientsResponse {
  assignPatientsToClinic: AssignPatientsResult;
}

export interface RemovePatientsResponse {
  removePatientsFromClinic: RemovePatientsResult;
}

export interface GetClinicPatientsResponse {
  clinicPatients: ClinicPatient[];
}

export interface AssignPatientsVariables {
  clinicId: string;
  patientIds: string[];
}

export interface RemovePatientsVariables {
  clinicId: string;
  patientIds: string[];
}
