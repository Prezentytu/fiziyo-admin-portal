import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'exercises',
        'patients',
        'sets',
        'org',
        'settings',
        'auth',
        'ci',
        'ui',
        'assignment',
        'verification',
        'chat',
        'import',
        'clinical',
        'finances',
        'onboarding',
        'shared',
        'deps',
      ],
    ],
    'scope-empty': [0],
    'subject-case': [2, 'always', 'lower-case'],
  },
};

export default config;
