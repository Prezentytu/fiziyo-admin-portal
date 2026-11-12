// Prawdziwe odpowiedzi HotChocolate 15.1.14 (ta sama wersja co fizjo-app), zebrane z harnessu Kestrel z
// ExecutionTimeout=2 s i [Authorize]. Kształt: status HTTP i ciało odpowiedzi GraphQL.
export const HOTCHOCOLATE_RESPONSES = {
  unknownField: {
    status: 400,
    body: '{"errors": [{"message": "The field `availability` does not exist on the type `Ex`.", "locations": [{"line": 1, "column": 44}], "path": ["exerciseById"], "extensions": {"type": "Ex", "field": "availability", "responseName": "availability", "specifiedBy": "https://spec.graphql.org/October2021/#sec-Field-Selections-on-Objects-Interfaces-and-Unions-Types"}}]}',
  },
  unknownArg: {
    status: 400,
    body: '{"errors": [{"message": "The argument `nope` does not exist.", "locations": [{"line": 1, "column": 41}], "extensions": {"type": "Q", "field": "exerciseById", "argument": "nope", "specifiedBy": "https://spec.graphql.org/October2021/#sec-Required-Arguments"}}]}',
  },
  unknownVarType: {
    status: 400,
    body: '{"errors": [{"message": "The variable `id` is not compatible with the type of the current location.", "locations": [{"line": 1, "column": 34}], "path": ["exerciseById"], "extensions": {"variable": "id", "variableType": "Nope!", "locationType": "String!", "specifiedBy": "https://spec.graphql.org/October2021/#sec-All-Variable-Usages-are-Allowed"}}]}',
  },
  timeout: {
    status: 400,
    body: '{"errors": [{"message": "The request exceeded the configured timeout of `00:00:02`.", "extensions": {"code": "HC0045"}}]}',
  },
  unauth: {
    status: 200,
    body: '{"errors": [{"message": "The current user is not authorized to access this resource.", "locations": [{"line": 1, "column": 20}], "path": ["exerciseById"], "extensions": {"code": "AUTH_NOT_AUTHENTICATED"}}], "data": {"exerciseById": null}}',
  },
  resolver: {
    status: 200,
    body: '{"errors": [{"message": "db failure", "locations": [{"line": 1, "column": 20}], "path": ["exerciseById"]}], "data": {"exerciseById": null}}',
  },
} as const;
