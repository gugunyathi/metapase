/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_METAPASE_API_BASE?: string;
  readonly VITE_METAPASE_DATA_SOURCE?: string;
  readonly VITE_PAYPAL_SANDBOX_CLIENT_ID?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
