module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:jsx-a11y/recommended'],
  ignorePatterns: ['dist', 'coverage'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  rules: {
    ...require('eslint-plugin-react-hooks').configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'jsx-a11y/no-autofocus': 'off',
  },
};
