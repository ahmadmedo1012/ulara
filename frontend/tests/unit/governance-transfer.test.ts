import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, type ApiRequestConfig } from '../../src/lib/api';
import { uploadGovernancePdf } from '../../src/lib/institutional/api';

const initial = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = initial; vi.unstubAllGlobals(); });

describe('governance document transfer', () => {
  it.each(['single', 'multipart', 'missing-etag', 'unavailable'])('%s', async (scenario) => {
    const multi = scenario === 'multipart' || scenario === 'missing-etag';
    const file = new File(['%PDF-example'], 'وثيقة.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: (multi ? 101 : 21) * 1024 * 1024 });
    const requests: ApiRequestConfig[] = [];
    const put = vi.fn(async () => new Response(null, { headers: scenario === 'missing-etag' ? {} : { etag: '"part"' } }));
    vi.stubGlobal('fetch', put);
    api.defaults.adapter = async config => {
      requests.push(config);
      if (scenario === 'unavailable') throw new Error('unavailable');
      const data = config.url?.endsWith('/complete') ? { key: 'k', sizeBytes: file.size, mimeType: file.type }
        : multi ? { mode: 'multipart', uploadId: 'id', partSize: 64*1024*1024, key: 'k', parts: [1,2].map(partNumber => ({ partNumber, url: 'https://storage.invalid/' + partNumber })) }
        : { mode: 'single', key: 'k', url: 'https://storage.invalid/file', headers: { 'Content-Type': file.type } };
      return { config, data: { data }, status: 200, statusText: 'OK', headers: {} };
    };
    const result = uploadGovernancePdf(file);
    if (scenario === 'missing-etag' || scenario === 'unavailable') {
      await expect(result).rejects.toThrow();
      expect(requests.map(r => r.url)).toEqual(['/governance/documents/presign']);
      expect(put).toHaveBeenCalledTimes(scenario === 'unavailable' ? 0 : 1);
    } else {
      await expect(result).resolves.toMatchObject({ key: 'k' });
      expect(requests.map(r => r.url)).toEqual(['/governance/documents/presign','/governance/documents/complete']);
      expect(put).toHaveBeenCalledTimes(multi ? 2 : 1);
      expect(put).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/storage\.invalid/), expect.objectContaining({ credentials: 'omit', method: 'PUT' }));
      expect(requests[1]?.data).toEqual(multi ? { key: 'k', uploadId: 'id', parts: [1,2].map(partNumber => ({ partNumber, etag: '"part"' })) } : { key: 'k' });
    }
  });
});
