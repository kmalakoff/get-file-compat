import assert from 'assert';
import { getContent } from 'get-file-compat';
import Pinkie from 'pinkie-promise';
import { bufferFrom } from '../../src/lib/compat.ts';

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
      const content = await getContent(TEXT_URL);
      assert.ok(Buffer.isBuffer(content), 'Should return a Buffer');
      assert.ok(content.length > 0, 'Buffer should have content');
      // Verify it's the right content
      const text = content.toString('utf8');
      assert.ok(text.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
    });

    it('callback: should return a Buffer', (done) => {
      getContent(TEXT_URL, (err, content) => {
        if (err) return done(err);
        assert.ok(Buffer.isBuffer(content), 'Should return a Buffer');
        assert.ok((content as Buffer).length > 0, 'Buffer should have content');
        done();
      });
    });
  });

  describe('utf8 encoding (returns string)', () => {
    it('promise: should return a string', async () => {
      const content = await getContent(TEXT_URL, 'utf8');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
    });

    it('callback: should return a string', (done) => {
      getContent(TEXT_URL, 'utf8', (err, content) => {
        if (err) return done(err);
        assert.strictEqual(typeof content, 'string', 'Should return a string');
        assert.ok((content as string).indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
        done();
      });
    });
  });

  describe('base64 encoding (returns base64 string)', () => {
    it('promise: should return a base64 encoded string', async () => {
      const content = await getContent(TEXT_URL, 'base64');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      // Verify it's valid base64 by decoding it
      const decoded = bufferFrom(content, 'base64').toString('utf8');
      assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
    });

    it('callback: should return a base64 encoded string', (done) => {
      getContent(TEXT_URL, 'base64', (err, content) => {
        if (err) return done(err);
        assert.strictEqual(typeof content, 'string', 'Should return a string');
        const decoded = bufferFrom(content as string, 'base64').toString('utf8');
        assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
        done();
      });
    });
  });

  describe('hex encoding (returns hex string)', () => {
    it('promise: should return a hex encoded string', async () => {
      const content = await getContent(TEXT_URL, 'hex');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      // Verify it's valid hex by decoding it
      const decoded = bufferFrom(content, 'hex').toString('utf8');
      assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
    });

    it('callback: should return a hex encoded string', (done) => {
      getContent(TEXT_URL, 'hex', (err, content) => {
        if (err) return done(err);
        assert.strictEqual(typeof content, 'string', 'Should return a string');
        const decoded = bufferFrom(content as string, 'hex').toString('utf8');
        assert.ok(decoded.indexOf('win-x64/node_pdb.zip') >= 0, 'Decoded content should contain expected text');
        done();
      });
    });
  });

  describe('ascii encoding (returns ascii string)', () => {
    it('promise: should return an ascii string', async () => {
      const content = await getContent(TEXT_URL, 'ascii');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
    });
  });

  describe('latin1 encoding (returns latin1 string)', () => {
    // latin1 encoding was added in Node 6.4.0
    const major = +process.versions.node.split('.')[0];
    const supportsLatin1 = major >= 7 || (major === 6 && +process.versions.node.split('.')[1] >= 4);

    it('promise: should return a latin1 string', async function () {
      if (!supportsLatin1) return this.skip();
      const content = await getContent(TEXT_URL, 'latin1');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
    });
  });

  describe('JSON content (user parses)', () => {
    it('promise: Buffer then JSON.parse', async () => {
      const buffer = await getContent(JSON_URL);
      assert.ok(Buffer.isBuffer(buffer), 'Should return a Buffer');
      const parsed = JSON.parse(buffer.toString('utf8'));
      assert.ok(parsed.latest !== undefined, 'Should have latest property');
    });

    it('promise: utf8 then JSON.parse', async () => {
      const content = await getContent(JSON_URL, 'utf8');
      assert.strictEqual(typeof content, 'string', 'Should return a string');
      const parsed = JSON.parse(content);
      assert.ok(parsed.latest !== undefined, 'Should have latest property');
    });

    it('callback: utf8 then JSON.parse', (done) => {
      getContent(JSON_URL, 'utf8', (err, content) => {
        if (err) return done(err);
        const parsed = JSON.parse(content as string);
        assert.ok(parsed.latest !== undefined, 'Should have latest property');
        done();
      });
    });
  });

  describe('consistency between Buffer and string', () => {
    it('Buffer.toString(utf8) should equal getContent with utf8', async () => {
      const buffer = await getContent(TEXT_URL);
      const string = await getContent(TEXT_URL, 'utf8');
      assert.strictEqual(buffer.toString('utf8'), string, 'Should be equal');
    });

    it('Buffer.toString(base64) should equal getContent with base64', async () => {
      const buffer = await getContent(TEXT_URL);
      const base64 = await getContent(TEXT_URL, 'base64');
      assert.strictEqual(buffer.toString('base64'), base64, 'Should be equal');
    });

    it('Buffer.toString(hex) should equal getContent with hex', async () => {
      const buffer = await getContent(TEXT_URL);
      const hex = await getContent(TEXT_URL, 'hex');
      assert.strictEqual(buffer.toString('hex'), hex, 'Should be equal');
    });
  });
});
