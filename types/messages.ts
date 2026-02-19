export type ExportRequest = { type: 'EXPORT_TO_MARKDOWN' };

export type ExportResponse =
  | { markdown: string; title?: string }
  | { error: string };
