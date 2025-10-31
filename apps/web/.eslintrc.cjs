module.exports = {
  root: true,
  extends: ['next/core-web-vitals', require.resolve('@digiclient/config/eslint')],
  ignorePatterns: ['../../supabase/functions/**'],
};