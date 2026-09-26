/**
 * エラーを画面の下部に DOM で表示するパネル。
 *
 * キャンバスの上に重ねるだけで、ゲームの画面は消さない(下に見えている画面の状態も手がかりになるため)。
 * パネルの外(キャンバス)への操作はそのまま届く。
 * 2件目以降は文面を差し替え、件数を数える。「閉じる」で隠し、「再読み込み」でページを読み直す(仮仕様)。
 */
import { type ErrorReportOptions, formatErrorReport } from './errorReport';

export class ErrorPanel {
  private element: HTMLElement | null = null;
  private text: HTMLElement | null = null;
  private count = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: ErrorReportOptions,
  ) {}

  /** エラーを表示する(開発者ツールで見られる環境のため、console にも出す) */
  show(error: unknown): void {
    this.count += 1;
    console.error(error);
    const text = this.text ?? this.create();
    text.textContent = formatErrorReport(error, this.count, this.options);
  }

  private create(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'error-panel';
    element.setAttribute('role', 'alert');
    const text = document.createElement('div');
    text.className = 'error-panel-text';
    const buttons = document.createElement('div');
    buttons.className = 'error-panel-buttons';
    buttons.append(
      this.button('再読み込み', () => window.location.reload()),
      this.button('閉じる', () => this.close()),
    );
    element.append(text, buttons);
    this.root.appendChild(element);
    this.element = element;
    this.text = text;
    return text;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  private close(): void {
    this.element?.remove();
    this.element = null;
    this.text = null;
  }
}
