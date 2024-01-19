const { resolve } = require('node:path');

const project = resolve(__dirname, './tsconfig.json');

module.exports = {
  extends: ['custom/next'],
  parserOptions: {
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      }
    }
  ]
};
