import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { validateDocuments } from './validate-graphql-documents.mjs';

const SDL = 'type Query { patients: [Patient!]! }\ntype Patient { id: String! name: String! }\n';

function fixture(sdl) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-docs-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'schema.graphql'), sdl);
  fs.writeFileSync(
    path.join(root, 'src', 'q.ts'),
    'const FRAGMENT = gql`fragment P on Patient { id name }`;\nexport const Q = gql`query Q { patients { ...P } } ${FRAGMENT}`;\n'
  );
  return { root, envSchemaPath: path.join(root, 'schema.graphql') };
}

test('dokument zgodny ze schematem przechodzi, także z fragmentem w interpolacji', () => {
  const result = validateDocuments({ ...fixture(SDL), searchRoots: ['src'], requireSchema: true });
  assert.equal(result.ok, true);
  assert.equal(result.parsed, 2);
});

test('pole usunięte ze schematu daje błąd z nazwą pola', () => {
  const broken = SDL.replace(' name: String!', '');
  const result = validateDocuments({ ...fixture(broken), searchRoots: ['src'], requireSchema: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Cannot query field "name" on type "Patient"/);
});
