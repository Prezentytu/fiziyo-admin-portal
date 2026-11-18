/** Parametr, z którym /verify wraca na /register: formularz bierze dane z trwającej rejestracji. */
export const REGISTER_BACK_PARAM = 'powrot';
export const REGISTER_BACK_HREF = `/register?${REGISTER_BACK_PARAM}=1`;

/** Tyle pól trwającej rejestracji Clerk czytamy; hasła Clerk nie oddaje. */
export interface PendingSignUpLike {
  status: string | null;
  emailAddress: string | null;
  unsafeMetadata?: Record<string, unknown>;
}

export interface PendingRegistration {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Dane do ponownego wypełnienia formularza albo null, gdy nie ma niedokończonej rejestracji. */
export function readPendingRegistration(signUp: PendingSignUpLike | null | undefined): PendingRegistration | null {
  if (!signUp || signUp.status !== 'missing_requirements' || !signUp.emailAddress) return null;
  const meta = signUp.unsafeMetadata ?? {};
  return {
    email: signUp.emailAddress,
    firstName: text(meta.firstName),
    lastName: text(meta.lastName),
    phone: text(meta.phone),
    companyName: text(meta.companyName),
  };
}
