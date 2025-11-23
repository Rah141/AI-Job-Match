declare module 'file-saver' {
  export function saveAs(blob: Blob | File, filename: string): void;
  export function saveAs(blob: Blob | File, filename: string, options?: { autoBom?: boolean }): void;
  export default saveAs;
}

