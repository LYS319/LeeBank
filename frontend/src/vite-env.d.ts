/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_AGENT_URL: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}