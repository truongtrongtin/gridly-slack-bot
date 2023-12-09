module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
  },
  ignorePatterns: ['.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
