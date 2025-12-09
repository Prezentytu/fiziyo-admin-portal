/**
 * Typy dla modelu User zgodne z nową strukturą backendu
 */

/**
 * Enum dla ról systemowych
 */
export enum SystemRole {
  SITE_SUPER_ADMIN = "site_super_admin",
  SITE_ADMIN = "site_admin",
}

/**
 * Enum dla ról w organizacji (lowercase - zgodne z bazą danych)
 */
export enum OrganizationRole {
  OWNER = "owner",
  ADMIN = "admin",
  THERAPIST = "therapist",
  STAFF = "staff",
}

/**
 * Dane osobowe użytkownika
 */
export interface PersonalDataUser {
  firstName: string;
  lastName: string;
}

/**
 * Dane kontaktowe użytkownika
 */
export interface ContactData {
  phone: string;
  address: string;
}

/**
 * Pełna struktura użytkownika
 */
export interface User {
  id: string;
  creationTime: string;
  clerkId: string;
  username: string;
  fullname: string;
  email: string;
  image?: string;
  systemRole?: SystemRole;
  defaultOrganizationId?: string;
  isShadowUser?: boolean;
  hasPassword: boolean;
  activationToken?: string;
  activationTokenExpiry?: string;
  personalData: PersonalDataUser;
  contactData: ContactData;
  isActive: boolean;
  organizationIds: string[];
}

/**
 * Informacje o organizacji użytkownika z rolą
 * Backend zwraca role jako lowercase strings: "owner", "admin", "therapist", "staff"
 */
export interface UserOrganizationWithRole {
  organizationId: string;
  organizationName: string;
  role: string; // lowercase string z backendu
  joinedAt: string;
}
