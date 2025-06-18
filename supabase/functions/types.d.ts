// Global type declarations for Deno APIs

declare global {
  namespace Deno {
    export interface ServeOptions {
      port?: number;
      hostname?: string;
      signal?: AbortSignal;
      reusePort?: boolean;
      onListen?: (params: { hostname: string; port: number }) => void;
    }

    export type ServeHandler = (request: Request) => Response | Promise<Response>;
    
    export function serve(handler: ServeHandler, options?: ServeOptions): Promise<void>;
    export function serve(options: ServeHandlerOptions): Promise<void>;

    export interface ServeHandlerOptions extends ServeOptions {
      handler: ServeHandler;
    }

    export interface Env {
      get(key: string): string | undefined;
      set(key: string, value: string): void;
      has(key: string): boolean;
      delete(key: string): boolean;
      toObject(): { [key: string]: string };
    }

    export const env: Env;
  }
}

// This ensures the file is treated as a module
export {}; 