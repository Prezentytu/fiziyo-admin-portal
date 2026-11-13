#!/usr/bin/env node
import { parse, validate, buildSchema, specifiedRules, NoUnusedFragmentsRule, Kind } from 'graphql';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Alias `@/*` z tsconfig.json: bez niego fragment importowany jako `@/graphql/...` nie rozwija się do const gql.
const SOURCE_OPTIONS = {
  allowJs: true,
  noLib: true,
  noResolve: true,
  types: [],
  jsx: ts.JsxEmit.Preserve,
  baseUrl: process.cwd(),
  paths: { '@/*': ['src/*'] },
};

// Panel: wszystkie dokumenty gql są w src/ (src/graphql, plus pojedyncze użycia w innych modułach).
export const DEFAULT_SEARCH_ROOTS = ['src'];
export const SCHEMA_CANDIDATES = ['backend/schema.graphql', 'graphql/schema.graphql'];

export function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') {
        continue;
      }
      walk(full, acc);
    } else if (/\.(ts|tsx|js|jsx|graphql)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

export function extractDocuments(file, program = ts.createProgram([file], SOURCE_OPTIONS)) {
  if (file.endsWith('.graphql')) {
    return [fs.readFileSync(file, 'utf8')];
  }
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const docs = [];
  const active = new Set();
  const isGql = (node) => ts.isTaggedTemplateExpression(node) && ts.isIdentifier(node.tag) && node.tag.text === 'gql';

  function expand(node) {
    if (active.has(node)) {
      throw new Error('Cyclic GraphQL fragment interpolation.');
    }
    active.add(node);
    let result;
    if (isGql(node)) {
      const template = node.template;
      result = ts.isNoSubstitutionTemplateLiteral(template)
        ? template.text
        : template.head.text +
          template.templateSpans.map((span) => expand(span.expression) + span.literal.text).join('');
    } else if (ts.isIdentifier(node)) {
      let symbol = checker.getSymbolAtLocation(node);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
      }
      const declaration = symbol?.valueDeclaration;
      if (
        !declaration ||
        !ts.isVariableDeclaration(declaration) ||
        !ts.isVariableDeclarationList(declaration.parent) ||
        !(declaration.parent.flags & ts.NodeFlags.Const) ||
        !declaration.initializer ||
        !isGql(declaration.initializer)
      ) {
        throw new Error('Unsupported GraphQL interpolation: expected a const gql fragment.');
      }
      result = expand(declaration.initializer);
    } else {
      throw new Error('Unsupported GraphQL interpolation: expressions are not executed.');
    }
    active.delete(node);
    return result;
  }

  function visit(node) {
    if (isGql(node)) docs.push(expand(node));
    ts.forEachChild(node, visit);
  }
  if (!source) throw new Error('GraphQL source file could not be parsed.');
  visit(source);
  return docs;
}

export function loadSchema(root, candidates = SCHEMA_CANDIDATES, envPath = process.env.GRAPHQL_SCHEMA_PATH) {
  const resolved = envPath ? [envPath] : candidates;
  for (const relative of resolved) {
    const full = path.isAbsolute(relative) ? relative : path.join(root, relative);
    if (fs.existsSync(full)) {
      const sdl = fs.readFileSync(full, 'utf8');
      return { schema: buildSchema(sdl), path: full };
    }
  }
  return null;
}

/** Dokumenty gql z plików pod `searchRoots` (AST) i błędy odczytu, bez walidacji względem schematu. */
export function parseDocuments(root, searchRoots = DEFAULT_SEARCH_ROOTS) {
  const files = searchRoots.flatMap((searchRoot) => walk(path.join(root, searchRoot)));
  const program = ts.createProgram(
    files.filter((file) => !file.endsWith('.graphql')),
    SOURCE_OPTIONS
  );
  const errors = [];
  const documents = [];

  for (const file of files) {
    try {
      for (const document of extractDocuments(file, program)) {
        const trimmed = document.trim();
        if (!trimmed) continue;
        documents.push({ file, ast: parse(trimmed) });
      }
    } catch (error) {
      errors.push(`${path.relative(root, file)}: ${error.message}`);
    }
  }
  return { documents, errors };
}

export function validateDocuments({
  root,
  searchRoots = DEFAULT_SEARCH_ROOTS,
  requireSchema = false,
  schemaCandidates = SCHEMA_CANDIDATES,
  envSchemaPath,
}) {
  const { documents, errors } = parseDocuments(root, searchRoots);
  const parsed = documents.length;

  if (errors.length > 0) {
    return { ok: false, parsed, errors };
  }

  if (parsed === 0) {
    return { ok: false, parsed, errors: ['Nie znaleziono dokumentów GraphQL (gql`...`).'] };
  }

  let loaded;
  try {
    loaded = loadSchema(root, schemaCandidates, envSchemaPath);
  } catch (error) {
    return { ok: false, parsed, errors: [`Invalid GraphQL schema: ${error.message}`] };
  }
  if (!loaded) {
    if (requireSchema || envSchemaPath || process.env.GRAPHQL_SCHEMA_PATH) {
      return {
        ok: false,
        parsed,
        errors: ['Brak schema.graphql — walidacja kontraktu wymaga SDL backendu (backend/schema.graphql).'],
      };
    }
    return { ok: true, parsed, skippedSchema: true };
  }

  for (const { file, ast } of documents) {
    const fragmentOnly = ast.definitions.every((definition) => definition.kind === Kind.FRAGMENT_DEFINITION);
    const rules = fragmentOnly ? specifiedRules.filter((rule) => rule !== NoUnusedFragmentsRule) : specifiedRules;
    for (const issue of validate(loaded.schema, ast, rules)) {
      errors.push(`${path.relative(root, file)}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, parsed, errors, schemaPath: loaded.path };
  }

  return { ok: true, parsed, schemaPath: loaded.path };
}

function isMain() {
  const current = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return path.resolve(current) === invoked;
}

if (isMain()) {
  const args = process.argv.slice(2);
  const requireSchema = args.includes('--require-schema') || process.env.GRAPHQL_SCHEMA_REQUIRED === '1';
  const searchRoots = args.filter((arg) => !arg.startsWith('--'));
  const result = validateDocuments({
    root: process.cwd(),
    searchRoots: searchRoots.length > 0 ? searchRoots : DEFAULT_SEARCH_ROOTS,
    requireSchema,
  });

  if (!result.ok) {
    console.error(`GraphQL validation failed (${result.errors.length}):`);
    for (const error of result.errors.slice(0, 50)) {
      console.error(` - ${error}`);
    }
    process.exit(1);
  }

  if (result.skippedSchema) {
    console.log(`OK: ${result.parsed} dokumentów GraphQL (składnia). Brak schema.graphql — pomijam walidację pól.`);
    process.exit(0);
  }

  console.log(`OK: ${result.parsed} dokumentów GraphQL zgodnych z ${path.relative(process.cwd(), result.schemaPath)}`);
}
