/**
 * 起動に失敗したとき、原因を画面に表示する。
 * スマホでは開発者ツールのコンソールを見られないため、エラー内容を DOM に直接書き出す。
 */
export function showBootError(root: HTMLElement, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const message = document.createElement('div');
  message.className = 'boot-error';
  message.textContent = `起動に失敗しました。\n\n${detail}\n\nUA: ${navigator.userAgent}`;
  root.replaceChildren(message);
  console.error(error);
}
