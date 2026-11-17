import * as fs from 'fs';
import { rm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import { bind } from 'node-version-call-local';
import * as path from 'path';
import pump from 'pump';
import tempSuffix from 'temp-suffix';
import url from 'url';
import makeRequest from './lib/makeRequest.ts';

import type { GetFileCallback, GetFileOptions, GetFileResult } from './types.ts';

// node 0.x does not support https or has untrusted certs
const major = +process.versions.node.split('.')[0];
const noHTTPS = major === 0;
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'getFile.js');

function run(endpoint: string, dest: string, options: GetFileOptions, callback: GetFileCallback) {
  makeRequest(endpoint, { timeout: options.timeout }, (err, res) => {
    if (err) return callback(err);
    if (!res) return callback(new Error('No response'));
    mkdirp(path.dirname(dest), (err: Error | null) => {
      if (err && (err as NodeJS.ErrnoException).code !== 'EEXIST') return callback(err);

      // write to a temporary name so a cut-off download never leaves a partial file at dest
      const tempPath = tempSuffix(dest);
      // pump's callback reports a cut-off response; the file stream alone can emit 'close' before that error.
      // Older Node reports a cut-off only through the response's 'aborted' event, so that counts too (first outcome wins).
      let finished = false;
      const writeStream = fs.createWriteStream(tempPath);
      const finish = (err?: Error | null) => {
        if (finished) return;
        finished = true;
        if (err) return rm(tempPath, () => callback(err));

        const done = () => callback(null, { path: dest, headers: res.headers as Record<string, string | string[]>, statusCode: res.statusCode ?? 200 });
        fs.rename(tempPath, dest, (err) => {
          if (!err) return done();
          const code = (err as NodeJS.ErrnoException).code;
          // another process may have won the rename race (Windows reports EPERM when dest is locked): trust that only if a file is at dest
          if (code === 'EPERM' || code === 'EEXIST' || code === 'ENOTEMPTY') {
            return fs.stat(dest, (statErr, stats) => {
              if (statErr || !stats.isFile()) return rm(tempPath, () => callback(err));
              rm(tempPath, done);
            });
          }
          rm(tempPath, () => callback(err));
        });
      };
      res.on('aborted', () => {
        if (finished || res.complete) return; // complete: the whole body arrived before the socket closed
        const ws = writeStream as fs.WriteStream & { destroy?: () => void };
        ws.destroy ? ws.destroy() : ws.end();
        finish(new Error('Response aborted before the download completed'));
      });
      pump(res, writeStream, finish);
    });
  });
}

type getFileFunction = (endpoint: string, dest: string, options: GetFileOptions, callback: GetFileCallback) => void;

// spawnOptions: false - no node/npm spawn (network + fs only)
const worker = (noHTTPS ? bind('>0', workerPath, { callbacks: true, spawnOptions: false }) : run) as getFileFunction;

export default function getFile(endpoint: string, dest: string): Promise<GetFileResult>;
export default function getFile(endpoint: string, dest: string, options: GetFileOptions): Promise<GetFileResult>;
export default function getFile(endpoint: string, dest: string, callback: GetFileCallback): void;
export default function getFile(endpoint: string, dest: string, options: GetFileOptions, callback: GetFileCallback): void;
export default function getFile(endpoint: string, dest: string, optionsOrCallback?: GetFileOptions | GetFileCallback, callback?: GetFileCallback): void | Promise<GetFileResult> {
  const options: GetFileOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

  if (typeof cb === 'function') return worker(endpoint, dest, options, cb);
  return new Promise((resolve, reject) => worker(endpoint, dest, options, (err, result) => (err ? reject(err) : resolve(result as GetFileResult))));
}
