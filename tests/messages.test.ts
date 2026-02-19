import { describe, it, expect } from 'vitest';
import type { ExportRequest, ExportResponse } from '../types/messages';

describe('Message contract (content ↔ popup)', () => {
  it('ExportRequest has required type field', () => {
    const req: ExportRequest = { type: 'EXPORT_TO_MARKDOWN' };
    expect(req.type).toBe('EXPORT_TO_MARKDOWN');
  });

  it('ExportResponse success has markdown', () => {
    const res: ExportResponse = { markdown: '# Hello' };
    expect('markdown' in res && res.markdown).toBe('# Hello');
  });

  it('ExportResponse error has error', () => {
    const res: ExportResponse = { error: 'No conversation found' };
    expect('error' in res && res.error).toBe('No conversation found');
  });

  it('discriminant: success vs error by key', () => {
    const success: ExportResponse = { markdown: 'x' };
    const failure: ExportResponse = { error: 'y' };
    expect('markdown' in success && !('error' in success)).toBe(true);
    expect('error' in failure && !('markdown' in failure)).toBe(true);
  });
});
