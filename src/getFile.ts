import * as fs from 'fs';
import * as Module from 'module';
import oo from 'on-one';
import pump from 'pump';
import makeRequest from './lib/makeRequest.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

let execPath = null; // break dependencies
let functionExec = null; // break dependencies

export type GetFileCallback = (err: Error | null, dest?: string) => void;

function worker(endpoint: string, dest: string, callback: GetFileCallback): void {
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
    const stream = pump(res, fs.createWriteStream(dest));
    oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
      err ? callback(err) : callback(null, dest);
    });
  });
}

export default function getFile(endpoint: string, dest: string, callback?: GetFileCallback): undefined | Promise<string> {
  if (typeof callback === 'function') return worker(endpoint, dest, callback) as undefined;
  return new Promise((resolve, reject) => worker(endpoint, dest, (err, dest) => (err ? reject(err) : resolve(dest))));
}
