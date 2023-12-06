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
};