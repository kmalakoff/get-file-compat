import * as fs from 'fs';
import mkdirp from 'mkdirp-classic';
import * as Module from 'module';
import oo from 'on-one';
import * as path from 'path';
import pump from 'pump';
import makeRequest from './lib/makeRequest.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

let execPath = null; // break dependencies
let functionExec = null; // break dependencies

import type { GetFileCallback, GetFileResult } from './types.ts';

function worker(endpoint: string, dest: string, callback: GetFileCallback) {
  // node <=0.8 does not support https
  if (noHTTPS) {
    if (!execPath) {
      const satisfiesSemverSync = _require('node-exec-path').satisfiesSemverSync;
      execPath = satisfiesSemverSync('>0'); // must be more than node 0.12
      if (!execPath) {
        callback(new Error('get-file-compat needs a version of node >0 to use https'));
        return;
      }
    }

    try {
      if (!functionExec) functionExec = _require('function-exec-sync');
      const result = functionExec({ execPath, callbacks: true }, __filename, endpoint, dest);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
    return;
  }

  // Modern Node - use shared makeRequest
  makeRequest(endpoint, (err, res) => {
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

export default function getFile(endpoint: string, dest: string): Promise<GetFileResult>;
export default function getFile(endpoint: string, dest: string, callback: GetFileCallback): void;
export default function getFile(endpoint: string, dest: string, callback?: GetFileCallback): void | Promise<GetFileResult> {
  if (typeof callback === 'function') return worker(endpoint, dest, callback);
  return new Promise((resolve, reject) => worker(endpoint, dest, (err, result) => (err ? reject(err) : resolve(result))));
}
