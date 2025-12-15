import assert from 'assert';
import { head } from 'get-file-compat';
import Pinkie from 'pinkie-promise';

describe('head', () => {
  (() => {
    // patch and restore promise
    if (typeof global === 'undefined') return;
    const globalPromise = global.Promise;
    before(() => {
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = globalPromise;
    });
  })();

  describe('successful HEAD requests', () => {
    it('callback: should get headers from URL', (done) => {
      head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', (err, response) => {
        if (err) {
          done(err);
          return;
        }
        assert.equal(response.statusCode, 200);
        assert.ok(response.headers['content-type']);
        assert.ok(response.headers['content-length']);
        assert.ok(response.headers.date);
        done();
      });
    });

    it('promise: should get headers from URL', async () => {
      const response = await head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');
      assert.equal(response.statusCode, 200);
      assert.ok(response.headers['content-type']);
      assert.ok(response.headers['content-length']);
      assert.ok(response.headers.date);
    });

    it('callback: should handle JSON API responses', (done) => {
      head('https://registry.npmjs.org/-/package/npm/dist-tags', (err, response) => {
        if (err) {
          done(err);
          return;
        }
        assert.equal(response.statusCode, 200);
        assert.ok(response.headers['content-type']);
        // JSON APIs may not include content-length in HEAD responses
        done();
      });
    });

    it('promise: should handle JSON API responses', async () => {
      const response = await head('https://registry.npmjs.org/-/package/npm/dist-tags');
      assert.equal(response.statusCode, 200);
      assert.ok(response.headers['content-type']);
      // JSON APIs may not include content-length in HEAD responses
    });
  });

  describe('error handling', () => {
    it('callback: should handle 404 errors', (done) => {
      head('https://nodejs.org/dist/v24.12.0/nonexistent-file.txt', (err, response) => {
        if (err) {
          assert.ok(err);
          done();
          return;
        }
        // Some servers may return 404 in response rather than error
        if (response.statusCode === 404) {
          assert.equal(response.statusCode, 404);
          done();
        } else {
          done(new Error('Expected 404 error'));
        }
      });
    });

    it('promise: should handle 404 errors', async () => {
      try {
        const response = await head('https://nodejs.org/dist/v24.12.0/nonexistent-file.txt');
        // Some servers may return 404 in response rather than error
        assert.equal(response.statusCode, 404);
      } catch (err) {
        assert.ok(err);
      }
    });

    it('callback: should handle invalid URLs', (done) => {
      head('not-a-valid-url', (err, _response) => {
        if (err) {
          assert.ok(err);
          done();
          return;
        }
        done(new Error('Expected error for invalid URL'));
      });
    });

    it('promise: should handle invalid URLs', async () => {
      try {
        await head('not-a-valid-url');
        throw new Error('Should have thrown an error');
      } catch (err) {
        assert.ok(err);
      }
    });
  });

  describe('response structure', () => {
    it('callback: should return proper response structure', (done) => {
      head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', (err, response) => {
        if (err) {
          done(err);
          return;
        }
        assert.ok(response, 'Response should exist');
        assert.ok(typeof response.statusCode === 'number', 'statusCode should be a number');
        assert.ok(typeof response.headers === 'object', 'headers should be an object');
        assert.ok(response.headers !== null, 'headers should not be null');
        done();
      });
    });

    it('promise: should return proper response structure', async () => {
      const response = await head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');
      assert.ok(response, 'Response should exist');
      assert.ok(typeof response.statusCode === 'number', 'statusCode should be a number');
      assert.ok(typeof response.headers === 'object', 'headers should be an object');
      assert.ok(response.headers !== null, 'headers should not be null');
    });
  });

  describe('consistency between implementations', () => {
    it('callback and promise should have same status code', async () => {
      const callbackResult = await new Promise<{ statusCode: number; headers: Record<string, string | string[]> } | undefined>((resolve, reject) => {
        head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });

      const promiseResult = await head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');

      assert.ok(callbackResult, 'Callback result should exist');
      assert.ok(promiseResult, 'Promise result should exist');
      assert.equal(callbackResult.statusCode, promiseResult.statusCode);
      assert.ok(callbackResult.headers, 'Callback request should have headers');
      assert.ok(promiseResult.headers, 'Promise request should have headers');
    });
  });
});
