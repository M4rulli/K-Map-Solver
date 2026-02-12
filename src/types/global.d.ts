export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: any[]) => Promise<void>;
    };
  }
}