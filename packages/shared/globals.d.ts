// Global type declarations for browser automation context

// jQuery types for Playwright page.evaluate context
interface Window {
  jQuery?: {
    (selector: any): any;
    active?: number;
  };
}

// Extend Console for error tracking
interface Console {
  errors?: any[];
}

// Extend Element for browser properties
interface Element {
  offsetParent?: Element | null;
  innerText?: string;
}

// Declare config as global (imported from local module)
declare const config: any;
