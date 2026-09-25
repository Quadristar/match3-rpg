import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages(https://<user>.github.io/<repo>/)でも、
  // 雛形から作った別名のリポジトリでもそのまま動くよう、相対パスにする
  base: './',
  build: {
    target: 'es2022',
    // 使っているライブラリのライセンス一覧を成果物に含める(公開 URL の licenses.txt で開ける)。
    // 既定の .vite/license.md は、先頭がドットのフォルダのため公開に含まれない可能性があるので名前を変える。
    // 拡張子を .txt にするのは、スマホのブラウザでダウンロードではなく文字として表示させるため
    license: { fileName: 'licenses.txt' },
    rolldownOptions: {
      output: {
        // ライブラリの著作権表記(/*! … */ や @license を含むコメント)を、圧縮後も残す。
        // GSAP のライセンスは表記の削除を禁止している(docs/decisions/002-adopt-gsap.md)
        comments: { legal: true },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
