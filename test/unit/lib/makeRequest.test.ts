import assert from 'assert';
import { createServer } from 'http';
import makeRequest from '../../../src/lib/makeRequest.ts';

// A real local server that never responds triggers the same request 'timeout' event
// nodejs.org would on a slow connection, with none of the flakiness of a live host.
function listen(server: ReturnType<typeof createServer>, callback: (url: string) => void): void {
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    callback(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`);
  });
}

describe('makeRequest', () => {
  describe('timeout', () => {
    it('tags a request timeout with code ETIMEDOUT', (done) => {
      const server = createServer(() => {
        // never respond
      });
      listen(server, (url) => {
        makeRequest(url, { timeout: 50 }, (err) => {
          server.close();
          assert.ok(err);
          assert.equal(err?.code, 'ETIMEDOUT');
          assert.ok(/^Request timeout after 50ms$/.test(err?.message || ''), err?.message);
          done();
        });
      });
    });
  });
});
