import { bind } from 'node-version-call-local';
import path from 'path';
import url from 'url';
import makeRequest from './lib/makeRequest.ts';

import type { HeadCallback, HeadResponse } from './types.ts';

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'head.js');

function run(endpoint: string, callback: HeadCallback) {
  makeRequest(endpoint, { method: 'HEAD' }, (err, res) => {
    if (err) return callback(err);
    res.resume(); // Discard any body
    callback(null, {
      statusCode: res.statusCode,
      headers: res.headers,
    });
  });
}

const worker = noHTTPS ? bind('>0', workerPath, { callbacks: true }) : run;

export default function head(endpoint: string): Promise<HeadResponse>;
export default function head(endpoint: string, callback: HeadCallback): void;
export default function head(endpoint: string, callback?: HeadCallback): void | Promise<HeadResponse> {
  if (typeof callback === 'function') {
    worker(endpoint, callback);
    return;
  }
  return new Promise((resolve, reject) => worker(endpoint, (err, response) => (err ? reject(err) : resolve(response))));
}
