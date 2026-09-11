// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'server/node_modules/*'],
  },
  {
    // A API (server/) roda em Node, não no ambiente RN/browser do resto do
    // projeto — sem isso, globals como __dirname, module e require disparam
    // "no-undef" à toa.
    files: ['server/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
]);