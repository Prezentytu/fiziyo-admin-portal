import { ErrorLink } from "@apollo/client/link/error";
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from "@apollo/client/errors";

const isDev = process.env.NODE_ENV === "development";

/**
 * Error Link do obsługi błędów GraphQL i Network
 * Loguje błędy w development mode i pomaga w debugowaniu
 * Apollo Client 4.0 API
 */
export class ErrorLinkFactory {
  create(): ErrorLink {
    return new ErrorLink(({ error, operation }) => {
      // Logowanie tylko w development mode
      if (!isDev) return;

      if (CombinedGraphQLErrors.is(error)) {
        // GraphQL errors
        error.errors.forEach(({ message, locations, path, extensions }) => {
          console.error(
            `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(
              locations
            )}, Path: ${JSON.stringify(path)}`,
            extensions
          );
        });

        console.error(
          `Error Summary:`,
          `\nOperation: ${operation.operationName}`,
          `\nGraphQL Errors: ${error.errors.length}`
        );
      } else if (CombinedProtocolErrors.is(error)) {
        // Protocol errors
        error.errors.forEach(({ message, extensions }) => {
          console.error(
            `[Protocol Error]: Message: ${message}, Extensions: ${JSON.stringify(
              extensions
            )}`
          );
        });
      } else {
        // Network error
        console.error(
          `[Network Error]`,
          `\nOperation: ${operation.operationName}`,
          `\nError:`,
          error
        );

        // Dodatkowe info dla 400 errors
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          (error as { statusCode: number }).statusCode === 400
        ) {
          console.error(
            `[Network 400 Error]`,
            `\nThis usually means bad request syntax or invalid query`
          );
        }
      }
    });
  }
}
