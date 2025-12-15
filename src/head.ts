import * as Module from 'module';
import makeRequest from './lib/makeRequest.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

let execPath = null; // break dependencies
let functionExec = null; // break dependencies

import type { HeadCallback, HeadResponse } from './types.ts';

function worker(endpoint: string, callback: HeadCallback): void {
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
      const result = functionExec({ execPath, callbacks: true }, __filename, endpoint);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
    return;
  }

  // Modern Node - use HEAD request
  makeRequest(endpoint, { method: 'HEAD' }, (err, res) => {
    if (err) return callback(err);
    res.resume(); // Discard any body
    callback(null, {
      statusCode: res.statusCode,
      headers: res.headers,
    });
  });
}

export default function head(endpoint: string): Promise<HeadResponse>;
export default function head(endpoint: string, callback: HeadCallback): void;
export default function head(endpoint: string, callback?: HeadCallback): undefined | Promise<HeadResponse> {
  if (typeof callback === 'function') {
    return worker(endpoint, callback) as undefined;
  }

  return new Promise((resolve, reject) => {
    worker(endpoint, (err, response) => (err ? reject(err) : resolve(response)));
  });
}
