import * as fs from 'fs';
import mkdirp from 'mkdirp-classic';
import { bind } from 'node-version-call-local';
import oo from 'on-one';
import * as path from 'path';
import pump from 'pump';
import url from 'url';
import makeRequest from './lib/makeRequest.ts';

import type { GetFileCallback, GetFileOptions, GetFileResult } from './types.ts';

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'getFile.js');

function run(endpoint: string, dest: string, options: GetFileOptions, callback: GetFileCallback) {
  makeRequest(endpoint, { timeout: options.timeout }, (err, res) => {
    if (err) return callback(err);
    mkdirp(path.dirname(dest), (err) => {
      if (err && err.code !== 'EEXIST') return callback(err);

      const stream = pump(res, fs.createWriteStream(dest));
      oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
        err ? callback(err) : callback(null, { path: dest, headers: res.headers, statusCode: res.statusCode });
      });
    });
  });
}

// spawnOptions: false - no node/npm spawn (network + fs only)
const worker = noHTTPS ? bind('>0', workerPath, { callbacks: true, spawnOptions: false }) : run;

export default function getFile(endpoint: string, dest: string): Promise<GetFileResult>;
export default function getFile(endpoint: string, dest: string, options: GetFileOptions): Promise<GetFileResult>;
export default function getFile(endpoint: string, dest: string, callback: GetFileCallback): void;
export default function getFile(endpoint: string, dest: string, options: GetFileOptions, callback: GetFileCallback): void;
export default function getFile(endpoint: string, dest: string, optionsOrCallback?: GetFileOptions | GetFileCallback, callback?: GetFileCallback): void | Promise<GetFileResult> {
  const options: GetFileOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

  if (typeof cb === 'function') {
    worker(endpoint, dest, options, cb);
    return;
  }
  return new Promise((resolve, reject) => worker(endpoint, dest, options, (err, result) => (err ? reject(err) : resolve(result))));
}
