import type { CodegenConfig } from '@graphql-codegen/cli';

const schemaUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050'}/graphql`;

const config: CodegenConfig = {
  schema: schemaUrl,
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
