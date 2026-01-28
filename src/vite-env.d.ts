/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '@/assets/*.svg' {
  const src: string;
  export default src;
}

