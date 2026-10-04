import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', '.features-gen/', 'playwright-report/', 'test-results/', 'blob-report/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Fixed sleeps hide timing bugs; rely on auto-waiting and web-first assertions.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'Use web-first assertions instead of fixed waits.',
        },
      ],
    },
  },
);
