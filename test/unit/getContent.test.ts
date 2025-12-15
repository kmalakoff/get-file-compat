import assert from 'assert';
import { getContent } from 'get-file-compat';
import Pinkie from 'pinkie-promise';
import { bufferFrom } from '../../src/compat.ts';

describe('getContent', () => {
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

  const TEXT_URL = 'https://nodejs.org/dist/v24.12.0/SHASUMS256.txt';
  const JSON_URL = 'https://registry.npmjs.org/-/package/npm/dist-tags';

  describe('no encoding (returns Buffer)', () => {
    it('promise: should return a Buffer', async () => {
      const result = await getContent(TEXT_URL);
      assert.ok(Buffer.isBuffer(result.content), 'Should return a Buffer');
      assert.ok(result.content.length > 0, 'Buffer should have content');
      // Verify it's the right content
      const text = result.content.toString('utf8');
      assert.ok(text.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
      assert.equal(result.statusCode, 200);
      assert.ok(result.headers['content-type']);
    });

    it('callback: should return a Buffer', (done) => {
      getContent(TEXT_URL, (err, result) => {
        if (err) return done(err);
        assert.ok(Buffer.isBuffer(result.content), 'Should return a Buffer');
        assert.ok(result.content.length > 0, 'Buffer should have content');
        assert.equal(result.statusCode, 200);
        assert.ok(result.headers['content-type']);
        done();
      });
    });
  });

  describe('utf8 encoding (returns string)', () => {
    it('promise: should return a string', async () => {
      const result = await getContent(TEXT_URL, 'utf8');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      assert.ok(result.content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
      assert.equal(result.statusCode, 200);
    });

    it('callback: should return a string', (done) => {
      getContent(TEXT_URL, 'utf8', (err, result) => {
        if (err) return done(err);
        assert.strictEqual(typeof result.content, 'string', 'Should return a string');
        assert.ok(result.content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
        assert.equal(result.statusCode, 200);
        done();
      });
    });
  });

  describe('base64 encoding (returns base64 string)', () => {
    it('promise: should return a base64 encoded string', async () => {
      const result = await getContent(TEXT_URL, 'base64');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      // Verify it's valid base64 by decoding it
      const decoded = bufferFrom(result.content, 'base64').toString('utf8');
      assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
      assert.equal(result.statusCode, 200);
    });

    it('callback: should return a base64 encoded string', (done) => {
      getContent(TEXT_URL, 'base64', (err, result) => {
        if (err) return done(err);
        assert.strictEqual(typeof result.content, 'string', 'Should return a string');
        const decoded = bufferFrom(result.content, 'base64').toString('utf8');
        assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
        assert.equal(result.statusCode, 200);
        done();
      });
    });
  });

  describe('hex encoding (returns hex string)', () => {
    it('promise: should return a hex encoded string', async () => {
      const result = await getContent(TEXT_URL, 'hex');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      // Verify it's valid hex by decoding it
      const decoded = bufferFrom(result.content, 'hex').toString('utf8');
      assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
      assert.equal(result.statusCode, 200);
    });

    it('callback: should return a hex encoded string', (done) => {
      getContent(TEXT_URL, 'hex', (err, result) => {
        if (err) return done(err);
        assert.strictEqual(typeof result.content, 'string', 'Should return a string');
        const decoded = bufferFrom(result.content, 'hex').toString('utf8');
        assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
        assert.equal(result.statusCode, 200);
        done();
      });
    });
  });

  describe('ascii encoding (returns ascii string)', () => {
    it('promise: should return an ascii string', async () => {
      const result = await getContent(TEXT_URL, 'ascii');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      assert.ok(result.content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
      assert.equal(result.statusCode, 200);
    });
  });

  describe('latin1 encoding (returns latin1 string)', () => {
    // latin1 encoding was added in Node 6.4.0
    const major = +process.versions.node.split('.')[0];
    const supportsLatin1 = major >= 7 || (major === 6 && +process.versions.node.split('.')[1] >= 4);

    it('promise: should return a latin1 string', async function () {
      if (!supportsLatin1) return this.skip();
      const result = await getContent(TEXT_URL, 'latin1');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      assert.ok(result.content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
      assert.equal(result.statusCode, 200);
    });
  });

  describe('JSON content (user parses)', () => {
    it('promise: Buffer then JSON.parse', async () => {
      const result = await getContent(JSON_URL);
      assert.ok(Buffer.isBuffer(result.content), 'Should return a Buffer');
      const parsed = JSON.parse(result.content.toString('utf8'));
      assert.ok(parsed.latest !== undefined, 'Should have latest property');
      assert.equal(result.statusCode, 200);
    });

    it('promise: utf8 then JSON.parse', async () => {
      const result = await getContent(JSON_URL, 'utf8');
      assert.strictEqual(typeof result.content, 'string', 'Should return a string');
      const parsed = JSON.parse(result.content);
      assert.ok(parsed.latest !== undefined, 'Should have latest property');
      assert.equal(result.statusCode, 200);
    });

    it('callback: utf8 then JSON.parse', (done) => {
      getContent(JSON_URL, 'utf8', (err, result) => {
        if (err) return done(err);
        const parsed = JSON.parse(result.content);
        assert.ok(parsed.latest !== undefined, 'Should have latest property');
        assert.equal(result.statusCode, 200);
        done();
      });
    });
  });

  describe('consistency between Buffer and string', () => {
    it('Buffer.toString(utf8) should equal getContent with utf8', async () => {
      const bufferResult = await getContent(TEXT_URL);
      const stringResult = await getContent(TEXT_URL, 'utf8');
      assert.strictEqual(bufferResult.content.toString('utf8'), stringResult.content, 'Should be equal');
    });

    it('Buffer.toString(base64) should equal getContent with base64', async () => {
      const bufferResult = await getContent(TEXT_URL);
      const base64Result = await getContent(TEXT_URL, 'base64');
      assert.strictEqual(bufferResult.content.toString('base64'), base64Result.content, 'Should be equal');
    });

    it('Buffer.toString(hex) should equal getContent with hex', async () => {
      const bufferResult = await getContent(TEXT_URL);
      const hexResult = await getContent(TEXT_URL, 'hex');
      assert.strictEqual(bufferResult.content.toString('hex'), hexResult.content, 'Should be equal');
    });
  });
});
