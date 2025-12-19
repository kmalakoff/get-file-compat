import type { Readable } from 'stream';
import { readableFrom } from './compat.ts';
import getContent from './getContent.ts';
import makeRequest from './lib/makeRequest.ts';

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

import type { GetStreamCallback, GetStreamOptions } from './types.ts';

function worker(endpoint: string, options: GetStreamOptions, callback: GetStreamCallback) {
  // On old Node, use getContent then convert buffer to stream
  if (noHTTPS) {
    getContent(endpoint, options, (err, result) => {
      if (err) return callback(err);
      const stream = readableFrom(result.content);
      callback(null, stream);
    });
    return;
  }

  // Modern Node - return actual response stream
  makeRequest(endpoint, { timeout: options.timeout }, (err, res) => {
    if (err) return callback(err);
    callback(null, res as Readable);
  });
}

export default function getStream(endpoint: string): Promise<Readable>;
export default function getStream(endpoint: string, options: GetStreamOptions): Promise<Readable>;
export default function getStream(endpoint: string, callback: GetStreamCallback): void;
export default function getStream(endpoint: string, options: GetStreamOptions, callback: GetStreamCallback): void;
export default function getStream(endpoint: string, optionsOrCallback?: GetStreamOptions | GetStreamCallback, callback?: GetStreamCallback): void | Promise<Readable> {
  const options: GetStreamOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

  if (typeof cb === 'function') return worker(endpoint, options, cb);
  return new Promise((resolve, reject) => worker(endpoint, options, (err, stream) => (err ? reject(err) : resolve(stream))));
}
