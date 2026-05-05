interface ClerkErrorMeta {
  paramName?: string;
}

interface ClerkErrorItem {
  code?: string;
  message?: string;
  longMessage?: string;
  meta?: ClerkErrorMeta;
}

interface ClerkErrorShape {
  errors?: ClerkErrorItem[];
  message?: string;
}

export interface ParsedClerkError {
  code?: string;
  paramName?: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseClerkError(error: unknown): ParsedClerkError {
  if (!isRecord(error)) {
    return { message: '' };
  }

  const errorShape = error as ClerkErrorShape;
  const firstError = Array.isArray(errorShape.errors) ? errorShape.errors[0] : undefined;
  const code = firstError?.code;
  const message = firstError?.longMessage ?? firstError?.message ?? errorShape.message ?? '';
  const paramName = firstError?.meta?.paramName;

  return { code, paramName, message };
}

export function isClerkUnknownParamError(error: unknown, paramName?: string): boolean {
  const parsedError = parseClerkError(error);
  const isUnknownParamCode =
    parsedError.code === 'form_param_unknown' || parsedError.code === 'form_param_format_invalid';

  if (!isUnknownParamCode) {
    return false;
  }

  if (!paramName) {
    return true;
  }

  return parsedError.paramName === paramName;
}

export function getClerkErrorMessagePL(error: unknown, fallbackMessage: string): string {
  const parsedError = parseClerkError(error);

  switch (parsedError.code) {
    case 'form_identifier_not_found':
      return 'Nie znaleziono użytkownika z podanym adresem email';
    case 'form_password_incorrect':
      return 'Nieprawidłowe hasło';
    case 'too_many_requests':
      return 'Zbyt wiele prób. Spróbuj ponownie za kilka minut';
    case 'session_exists':
      return 'Jesteś już zalogowany';
    case 'form_identifier_exists':
      return 'Ten adres email jest już zajęty';
    case 'form_param_unknown':
      return 'Jedno z pól nie jest obsługiwane przez ustawienia konta';
    case 'form_code_incorrect':
    case 'verification_failed':
      return 'Nieprawidłowy kod weryfikacyjny';
    case 'verification_expired':
      return 'Kod weryfikacyjny wygasł. Wyślij nowy kod';
    default:
      break;
  }

  const normalizedMessage = parsedError.message.toLowerCase();
  if (normalizedMessage.includes('identifier is invalid')) {
    return 'Wprowadź prawidłowy adres email';
  }
  if (normalizedMessage.includes('password')) {
    return 'Nieprawidłowe hasło';
  }

  return fallbackMessage;
}
