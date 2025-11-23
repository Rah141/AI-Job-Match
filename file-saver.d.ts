declare module 'file-saver' {
  export function saveAs(blob: Blob, filename: string): void;
  export function saveAs(blob: Blob, filename: string, options?: { autoBom?: boolean }): void;
  export default saveAs;
}

