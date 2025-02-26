declare module 'keyboardjs' {
  interface KeyEvent {
    preventDefault: () => void;
  }

  type KeyHandler = (e: KeyEvent) => void;

  interface KeyboardJS {
    bind: (key: string, pressHandler: KeyHandler, releaseHandler?: KeyHandler) => void;
    unbind: (key: string, pressHandler?: KeyHandler, releaseHandler?: KeyHandler) => void;
  }

  const keyboard: KeyboardJS;
  export default keyboard;
} 