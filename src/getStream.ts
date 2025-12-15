import type { Readable } from 'stream';
import getContent from './getContent.ts';
import { readableFrom } from './lib/compat.ts';
import makeRequest from './lib/makeRequest.ts';

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

export type GetStreamCallback = (err: Error | null, stream?: Readable) => void;

function worker(endpoint: string, callback: GetStreamCallback): void {
  // On old Node, use getContent then convert buffer to stream
  if (noHTTPS) {
    getContent(endpoint, (err, buffer) => {
      if (err) return callback(err);
      const stream = readableFrom(buffer);
      callback(null, stream);
    });
    return;
  }

  // Modern Node - return actual response stream
  makeRequest(endpoint, (err, res) => {
    if (err) return callback(err);
    callback(null, res as Readable);
  });
}

export default function getStream(endpoint: string): Promise<Readable>;
export default function getStream(endpoint: string, callback: GetStreamCallback): void;
export default function getStream(endpoint: string, callback?: GetStreamCallback): undefined | Promise<Readable> {
  if (typeof callback === 'function') {
    return worker(endpoint, callback) as undefined;
  }

  return new Promise((resolve, reject) => {
    worker(endpoint, (err, stream) => (err ? reject(err) : resolve(stream)));
  });
}
