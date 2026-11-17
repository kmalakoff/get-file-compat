import assert from 'assert';
import * as fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import get from 'get-file-compat';
import * as http from 'http';
import mkdirp from 'mkdirp-classic';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', '..', '.tmp', 'rename');
const BODY = new Array(1001).join('0123456789');

// node 0.x runs getFile in a blocking child process, so a server in this same process can never answer
const major = +process.versions.node.split('.')[0];
(major === 0 ? describe.skip : describe)('getFile temporary name then rename', () => {
  let server: http.Server;
  let port: number;

  before((done) => {
    safeRmSync(TEMP_DIR);
    mkdirp.sync(TEMP_DIR);
    server = http.createServer((req, res) => {
      if (req.url === '/full') {
        res.writeHead(200, { 'Content-Length': BODY.length });
        return res.end(BODY);
      }
      // promise more than is sent, then drop the socket mid-body
      res.writeHead(200, { 'Content-Length': BODY.length });
      res.write(BODY.slice(0, 100));
      setTimeout(() => req.socket.destroy(), 50);
    });
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as { port: number }).port;
      done();
    });
  });

  after((done) => {
    server.close(() => done());
  });

  function folder(name: string): string {
    const dir = path.join(TEMP_DIR, name);
    mkdirp.sync(dir);
    return dir;
  }

  it('complete download: dest has the full content and no temporary file is left', (done) => {
    const dir = folder('full');
    const dest = path.join(dir, 'file.txt');
    get(`http://127.0.0.1:${port}/full`, dest, (err, result) => {
      if (err || !result) return done(err ?? new Error('No result'));
      assert.equal(result.path, dest);
      assert.equal(fs.readFileSync(dest, 'utf8'), BODY);
      assert.deepEqual(fs.readdirSync(dir), ['file.txt']);
      done();
    });
  });

  it('cut-off download: error, no dest, no temporary file', (done) => {
    const dir = folder('cut');
    const dest = path.join(dir, 'file.txt');
    get(`http://127.0.0.1:${port}/cut`, dest, (err) => {
      assert.ok(err, 'expected an error');
      assert.ok(!fs.existsSync(dest), 'dest must not exist');
      assert.deepEqual(fs.readdirSync(dir), []);
      done();
    });
  });

  it('cut-off download leaves an existing dest unchanged', (done) => {
    const dir = folder('existing');
    const dest = path.join(dir, 'file.txt');
    fs.writeFileSync(dest, 'old content');
    get(`http://127.0.0.1:${port}/cut`, dest, (err) => {
      assert.ok(err, 'expected an error');
      assert.equal(fs.readFileSync(dest, 'utf8'), 'old content');
      assert.deepEqual(fs.readdirSync(dir), ['file.txt']);
      done();
    });
  });

  it('dest is a non-empty directory: fails and leaves no temporary file', (done) => {
    const dir = folder('dirdest');
    const dest = path.join(dir, 'file.txt');
    mkdirp.sync(dest);
    fs.writeFileSync(path.join(dest, 'inner.txt'), 'inner');
    get(`http://127.0.0.1:${port}/full`, dest, (err, result) => {
      assert.ok(err, 'expected an error');
      assert.ok(!result);
      assert.ok(fs.statSync(dest).isDirectory());
      assert.deepEqual(fs.readdirSync(dir), ['file.txt']);
      done();
    });
  });
});
