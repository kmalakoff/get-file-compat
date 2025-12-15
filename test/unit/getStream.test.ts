import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import { getStream } from 'get-file-compat';
import mkdirp from 'mkdirp-classic';
import oo from 'on-one';
import * as path from 'path';
import Pinkie from 'pinkie-promise';
import * as url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', '..', '.tmp');

// getStream requires Node 0.10+ (stream.Readable was added in 0.10)
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const supportsGetStream = major > 0 || minor >= 10;

describe('getStream', () => {
  if (!supportsGetStream) {
    it('requires Node 0.10 or higher', () => {
      // Skip all tests on Node < 0.10
    });
    return;
  }

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

  it('should return a readable stream (promise)', async () => {
    const stream = await getStream('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');
    assert.ok(stream, 'Should return a stream');
    assert.strictEqual(typeof stream.pipe, 'function', 'Should have pipe method');
    assert.strictEqual(typeof stream.on, 'function', 'Should have on method');

    // Collect stream content
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const content = Buffer.concat(chunks).toString('utf8');
    assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
  });

  it('should return a readable stream (callback)', (done) => {
    getStream('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', (err, stream) => {
      if (err) return done(err);
      assert.ok(stream, 'Should return a stream');
      assert.strictEqual(typeof stream.pipe, 'function', 'Should have pipe method');

      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));

      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        if (err) return done(err);
        const content = Buffer.concat(chunks).toString('utf8');
        assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
        done();
      });
    });
  });

  it('should be pipeable to a file', async () => {
    const stream = await getStream('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');
    const destPath = path.join(TEMP_DIR, 'stream-test.txt');
    const writeStream = fs.createWriteStream(destPath);

    stream.pipe(writeStream);

    await new Promise<void>((resolve, reject) => {
      oo(writeStream, ['error', 'finish'], (err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const content = fs.readFileSync(destPath, 'utf8');
    assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0, 'Should contain expected text');
  });

  it('should handle binary content correctly', async () => {
    const filename = 'node-v24.12.0-linux-x64.tar.gz';
    const stream = await getStream(`https://nodejs.org/dist/v24.12.0/${filename}`);

    const hash = crypto.createHash('sha256');
    stream.on('data', (data: Buffer) => hash.update(data));

    await new Promise<void>((resolve, reject) => {
      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Read expected hash from SHASUMS file
    const shasumsPath = path.join(TEMP_DIR, 'stream-test.txt');
    if (!fs.existsSync(shasumsPath)) {
      // Fetch SHASUMS if not already present
      const shaStream = await getStream('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt');
      const chunks: Buffer[] = [];
      shaStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      await new Promise<void>((resolve, reject) => {
        oo(shaStream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
          if (err) return reject(err);
          resolve();
        });
      });
      fs.writeFileSync(shasumsPath, Buffer.concat(chunks));
    }

    const text = fs.readFileSync(shasumsPath, 'utf8');
    const expected = text.split(filename)[0].split('\n').pop().trim();
    const actual = hash.digest('hex');
    assert.strictEqual(expected, actual, 'Hash should match');
  });
});
