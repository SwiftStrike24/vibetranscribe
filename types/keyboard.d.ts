// Type definitions for KeyboardJS

// Define a type for keyboard event
export interface KeyboardEvent {
  preventDefault: () => void;
}

// Define module declaration for keyboardjs
declare module 'keyboardjs' {
  export interface KeyboardJS {
    bind: (key: string, callback: (e: KeyboardEvent) => void) => void;
    unbind: (key: string) => void;
  }
  
  const keyboard: KeyboardJS;
  export default keyboard;
} 