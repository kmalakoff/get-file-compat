import { bind } from 'node-version-call-local';
import path from 'path';
import url from 'url';
import makeRequest from './lib/makeRequest.ts';

import type { HeadCallback, HeadOptions, HeadResponse } from './types.ts';

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'head.js');

function run(endpoint: string, options: HeadOptions, callback: HeadCallback) {
  makeRequest(endpoint, { method: 'HEAD', timeout: options.timeout }, (err, res) => {
    if (err) return callback(err);
    res.resume(); // Discard any body
    callback(null, {
      statusCode: res.statusCode,
      headers: res.headers,
    });
  });
}

type headFunction = (endpoint: string, options: HeadOptions, callback: HeadCallback) => void;

// spawnOptions: false - no node/npm spawn (network only)
const worker = (noHTTPS ? bind('>0', workerPath, { callbacks: true, spawnOptions: false }) : run) as headFunction;

export default function head(endpoint: string): Promise<HeadResponse>;
export default function head(endpoint: string, options: HeadOptions): Promise<HeadResponse>;
export default function head(endpoint: string, callback: HeadCallback): void;
export default function head(endpoint: string, options: HeadOptions, callback: HeadCallback): void;
export default function head(endpoint: string, optionsOrCallback?: HeadOptions | HeadCallback, callback?: HeadCallback): void | Promise<HeadResponse> {
  const options: HeadOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

  if (typeof cb === 'function') return worker(endpoint, options, cb);
  return new Promise((resolve, reject) => worker(endpoint, options, (err, response) => (err ? reject(err) : resolve(response))));
}
