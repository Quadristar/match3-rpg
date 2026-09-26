/**
 * window の error と unhandledrejection を受け取り、report に渡す。
 * シーンの切り替え以外の場所(ticker の中・イベント処理・Promise など)で起きたエラーを画面に出すため。
 */

/** イベントを登録できる対象(window が満たす。テストでは EventTarget を渡す) */
export interface ErrorEventSource {
  addEventListener(type: 'error' | 'unhandledrejection', listener: (event: Event) => void): void;
  removeEventListener(type: 'error' | 'unhandledrejection', listener: (event: Event) => void): void;
}

/** 登録し、解除する関数を返す */
export function installGlobalErrorHandlers(target: ErrorEventSource, report: (error: unknown) => void): () => void {
  const onError = (event: Event): void => {
    report(errorOf(event));
  };
  const onRejection = (event: Event): void => {
    report(readProperty(event, 'reason'));
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}

/** ErrorEvent から中身を取り出す(error がなければ message、それもなければイベントそのもの) */
function errorOf(event: Event): unknown {
  const error = readProperty(event, 'error');
  if (error !== undefined && error !== null) {
    return error;
  }
  const message = readProperty(event, 'message');
  return typeof message === 'string' && message !== '' ? message : event;
}

function readProperty(event: Event, key: string): unknown {
  const value: unknown = Reflect.get(event, key);
  return value;
}
