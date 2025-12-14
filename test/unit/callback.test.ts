import assert from 'assert';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import get from 'get-file-compat';
import mkdirp from 'mkdirp-classic';
import oo from 'on-one';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', '..', '.tmp');

describe('callbacks', () => {
  before(() => {
    safeRmSync(TEMP_DIR);
    mkdirp.sync(TEMP_DIR);
  });

  it('should download a text over https', (done) => {
    get('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', path.join(TEMP_DIR, 'SHASUMS256.txt'), (err, filePath) => {
      if (err) {
        done(err);
        return;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.indexOf('win-x64/node_pdb.zip') >= 0);
      done();
    });
  });

  it('should download json over https', (done) => {
    get('https://registry.npmjs.org/-/package/npm/dist-tags', path.join(TEMP_DIR, 'dist-tags.json'), (err, filePath) => {
      if (err) {
        done(err);
        return;
      }
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert.ok(content.latest !== undefined);
      done();
    });
  });

  it('should download compressed file over https', (done) => {
    const filename = 'node-v24.12.0-linux-x64.tar.gz';
    get(`https://nodejs.org/dist/v24.12.0/${filename}`, path.join(TEMP_DIR, filename), (err, filePath) => {
      if (err) {
        done(err);
        return;
      }
      const text = fs.readFileSync(path.join(TEMP_DIR, 'SHASUMS256.txt'), 'utf8');
      const expected = text.split(filename)[0].split('\n').pop().trim();
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
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
});
