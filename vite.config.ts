import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages(https://<user>.github.io/<repo>/)でも、
  // 雛形から作った別名のリポジトリでもそのまま動くよう、相対パスにする
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
