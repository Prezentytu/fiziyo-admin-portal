import { ErrorLink } from "@apollo/client/link/error";
import type { GraphQLError } from "graphql";

/**
 * Error Link do obsługi błędów GraphQL i Network
 * Loguje błędy w development mode i pomaga w debugowaniu
 */
export class ErrorLinkFactory {
  create() {
    return new ErrorLink((errorHandler: any) => {
      const { graphQLErrors, networkError, operation } = errorHandler;

      if (graphQLErrors) {
        graphQLErrors.forEach((gqlError: GraphQLError) => {
          const { message, locations, path, extensions } = gqlError;

          console.error(
            `[GraphQL Error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${JSON.stringify(path)}`,
            extensions,
          );
        });
      }

      if (networkError) {
        console.error(
          `🔴 [Network Error]`,
          `\n📌 Operation: ${operation.operationName}`,
          `\n⚠️  Error:`,
          networkError,
          `\n📦 Variables:`,
          operation.variables,
        );

        // Dodatkowe info dla 400 errors
        if ("statusCode" in networkError && networkError.statusCode === 400) {
          console.error(
            `🚨 [Network 400 Error]`,
            `\n💡 This usually means bad request syntax or invalid query`,
            `\n📌 Check your GraphQL query and variables above`,
          );
        }
      }

      // Log całkowitej liczby błędów
      if (graphQLErrors || networkError) {
        console.error(
          `📊 Error Summary:`,
          `\nOperation: ${operation.operationName}`,
          `\nGraphQL Errors: ${graphQLErrors?.length || 0}`,
          `\nNetwork Error: ${networkError ? "Yes" : "No"}`,
        );
      }
    });
  }
}
