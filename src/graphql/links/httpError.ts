const SCHEMA_FAILURE_PATTERN = /HotChocolate\.SchemaException|The type 'System\.Void' may not be used as a type argument/i;

export function isJsonGraphqlContentType(contentType: string): boolean {
  return contentType.includes('application/json') || contentType.includes('application/graphql');
}

export function formatGraphqlHttpError(
  status: number,
  statusText: string,
  contentType: string,
  bodyText: string
): string {
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 280);

  if (SCHEMA_FAILURE_PATTERN.test(bodyText)) {
    return (
      `Backend GraphQL schema failed to start (HTTP ${status}). ` +
      `HotChocolate: The type 'System.Void' may not be used as a type argument.`
    );
  }

  if (contentType.includes('text/html')) {
    return `GraphQL server error: ${status} ${statusText}. Server returned HTML instead of JSON. Check if backend is running.`;
  }

  if (snippet.length > 0) {
    return `GraphQL server error: ${status} ${statusText}. ${snippet}`;
  }

  return `GraphQL server error: ${status} ${statusText}.`;
}

export function toUserFacingGraphqlError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (SCHEMA_FAILURE_PATTERN.test(message) || message.includes('schema failed to start')) {
    return 'Serwer GraphQL nie startuje (błąd schematu HotChocolate). To nie jest błąd portalu — sprawdź deploy backendu.';
  }

  if (message.includes('status code 500') || message.includes('HTTP 500') || message.includes('500 ')) {
    return 'Serwer API zwrócił błąd 500. Spróbuj ponownie lub sprawdź backend.';
  }

  return message;
}
