import type { CodegenConfig } from '@graphql-codegen/cli';
import fs from 'node:fs';

const localSchema = 'graphql/schema.graphql';
const schema = fs.existsSync(localSchema)
  ? localSchema
  : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050'}/graphql`;

const config: CodegenConfig = {
  schema,
  documents: ['src/graphql/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    'src/graphql/generated/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
};

export default config;
