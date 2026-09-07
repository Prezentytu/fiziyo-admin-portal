import { describe, expect, it } from 'vitest';
import { formatGraphqlHttpError, isJsonGraphqlContentType, toUserFacingGraphqlError } from '@/graphql/links/httpError';

describe('httpError', () => {
  it('detects json graphql content types', () => {
    expect(isJsonGraphqlContentType('application/json; charset=utf-8')).toBe(true);
    expect(isJsonGraphqlContentType('application/graphql')).toBe(true);
    expect(isJsonGraphqlContentType('text/plain')).toBe(false);
  });

  it('formats HotChocolate schema startup failure', () => {
    const message = formatGraphqlHttpError(
      500,
      'Internal Server Error',
      'text/plain',
      "HotChocolate.SchemaException: For more details look at the `Errors` property.\n1. The type 'System.Void' may not be used as a type argument."
    );

    expect(message).toContain('schema failed to start');
    expect(message).toContain('System.Void');
  });

  it('formats html error pages', () => {
    expect(formatGraphqlHttpError(502, 'Bad Gateway', 'text/html', '<html>error</html>')).toContain('HTML instead of JSON');
  });

  it('maps schema failure to a therapist-facing message', () => {
    expect(
      toUserFacingGraphqlError(new Error("HotChocolate.SchemaException: The type 'System.Void' may not be used as a type argument."))
    ).toContain('błąd schematu HotChocolate');
  });
});
