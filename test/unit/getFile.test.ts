import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import get, { head } from 'get-file-compat';
import mkdirp from 'mkdirp-classic';
import oo from 'on-one';
import * as path from 'path';
import Pinkie from 'pinkie-promise';
import * as url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', '..', '.tmp');

describe('getFile', () => {
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

  before(() => {
    safeRmSync(TEMP_DIR);
    mkdirp.sync(TEMP_DIR);
  });

  it('should preserve query string in URLs', (done) => {
    // npm search API requires 'text' query param - returns error without it
    const url = 'https://registry.npmjs.org/-/v1/search?text=is-promise&size=1';
    get(url, path.join(TEMP_DIR, 'search-result.json'), (err, result) => {
      if (err) {
        done(err);
        return;
      }
      const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      // If query string was dropped, we'd get {error: "'text' query parameter is required"}
      assert.ok(content.objects, 'Should have search results (query string preserved)');
      assert.ok(content.objects.length > 0, 'Should have at least one result');
      assert.strictEqual(content.objects[0].package.name, 'is-promise');
      assert.equal(result.statusCode, 200);
      assert.ok(result.headers['content-type']);
      done();
    });
  });

  it('promise: should preserve query string in URLs', async () => {
    // npm search API requires 'text' query param - returns error without it
    const url = 'https://registry.npmjs.org/-/v1/search?text=is-promise&size=1';
    const result = await get(url, path.join(TEMP_DIR, 'search-result-async.json'));
    const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    // If query string was dropped, we'd get {error: "'text' query parameter is required"}
    assert.ok(content.objects, 'Should have search results (query string preserved)');
    assert.ok(content.objects.length > 0, 'Should have at least one result');
    assert.strictEqual(content.objects[0].package.name, 'is-promise');
    assert.equal(result.statusCode, 200);
    assert.ok(result.headers['content-type']);
  });

  it('should download a text over https', (done) => {
    get('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', path.join(TEMP_DIR, 'SHASUMS256.txt'), (err, result) => {
      if (err) {
        done(err);
        return;
      }
      const content = fs.readFileSync(result.path, 'utf8');
      assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0);
      assert.equal(result.statusCode, 200);
      assert.ok(result.headers['content-type']);
      done();
    });
  });

  it('promise: should download a text over https', async () => {
    const result = await get('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', path.join(TEMP_DIR, 'SHASUMS256-async.txt'));
    const content = fs.readFileSync(result.path, 'utf8');
    assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0);
    assert.equal(result.statusCode, 200);
    assert.ok(result.headers['content-type']);
  });

  it('should download json over https', (done) => {
    get('https://registry.npmjs.org/-/package/npm/dist-tags', path.join(TEMP_DIR, 'dist-tags.json'), (err, result) => {
      if (err) {
        done(err);
        return;
      }
      const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      assert.ok(content.latest !== undefined);
      assert.equal(result.statusCode, 200);
      assert.ok(result.headers['content-type']);
      done();
    });
  });

  it('promise: should download json over https', async () => {
    const result = await get('https://registry.npmjs.org/-/package/npm/dist-tags', path.join(TEMP_DIR, 'dist-tags-async.json'));
    const content = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    assert.ok(content.latest !== undefined);
    assert.equal(result.statusCode, 200);
    assert.ok(result.headers['content-type']);
  });

  it('should download compressed file over https', (done) => {
    const filename = 'node-v24.12.0-linux-x64.tar.gz';
    get(`https://nodejs.org/dist/v24.12.0/${filename}`, path.join(TEMP_DIR, filename), (err, result) => {
      if (err) {
        done(err);
        return;
      }
      assert.equal(result.statusCode, 200);
      const text = fs.readFileSync(path.join(TEMP_DIR, 'SHASUMS256.txt'), 'utf8');
      const expected = text.split(filename)[0].split('\n').pop().trim();
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(result.path);
      stream.on('data', (data) => hash.update(data));
      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        if (err) {
          done(err);
          return;
        }
        const actual = hash.digest('hex');
        assert.equal(expected, actual);
        done();
      });
    });
  });

  it('promise: should download compressed file over https', (done) => {
    (async () => {
      const filename = 'node-v24.12.0-linux-x64.tar.gz';
      const result = await get(`https://nodejs.org/dist/v24.12.0/${filename}`, path.join(TEMP_DIR, `${filename}-async`));
      assert.equal(result.statusCode, 200);
      const text = fs.readFileSync(path.join(TEMP_DIR, 'SHASUMS256.txt'), 'utf8');
      const expected = text.split(filename)[0].split('\n').pop().trim();
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(result.path);
      stream.on('data', (data) => hash.update(data));
      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        if (err) {
          done(err);
          return;
        }
        const actual = hash.digest('hex');
        assert.equal(expected, actual);
        done();
      });
    })().catch(done);
  });

  it('should get headers with head request', (done) => {
    head('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', (err, response) => {
      if (err) {
        done(err);
        return;
      }
      assert.equal(response.statusCode, 200);
      assert.ok(response.headers['content-type']);
      assert.ok(response.headers['content-length']);
      done();
    });
  });
});
