import type { UserConfig } from 'vite-plus';
import { defineConfig } from 'vite-plus';

const config: UserConfig = defineConfig({
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    publint: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    printWidth: 200,
    singleQuote: true,
    sortPackageJson: true,
  },
  staged: {
    '*.{ts,mjs,cjs,json,md}': 'vp check --fix',
  },
});

export default config;
