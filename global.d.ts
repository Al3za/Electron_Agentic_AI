export {};

interface res_output {
  success: boolean;
  file: string;
}

declare global {
  // questo file serve per dare il corretto type e non 'raise l'error' al file renderer.ts
  // dove invochiamo electronAPI.
  interface Window {
    electronAPI: {
      sendInput: (text: string) => void;
      onResponse: (callback: (output: res_output) => void) => void;
    };
  }
}
