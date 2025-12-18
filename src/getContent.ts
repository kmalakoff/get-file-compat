import { bind } from 'node-version-call-local';
import oo from 'on-one';
import path from 'path';
import url from 'url';
import { bufferFrom } from './compat.ts';
import makeRequest from './lib/makeRequest.ts';

import type { GetContentCallback, GetContentResult } from './types.ts';

const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'getContent.js');

function run(endpoint: string, encoding: BufferEncoding | null, callback: GetContentCallback<Buffer | string>) {
  makeRequest(endpoint, (err, res) => {
    if (err) return callback(err);

    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    oo(res, ['error', 'end', 'close', 'finish'], (err?: Error) => {
      if (err) return callback(err);
      const buffer = Buffer.concat(chunks);
      const content = encoding ? buffer.toString(encoding) : buffer;
      callback(null, { content, headers: res.headers, statusCode: res.statusCode });
    });
  });
}

const call = bind('>0', workerPath, { callbacks: true });

function worker(endpoint: string, encoding: BufferEncoding | null, callback: GetContentCallback<Buffer | string>) {
  if (!noHTTPS) {
    run(endpoint, encoding, callback);
    return;
  }
  const enc = encoding || 'base64';
  call(endpoint, enc, (err: Error | null, result: GetContentResult<string>) => {
    if (err) return callback(err);
    const content = encoding ? result.content : bufferFrom(result.content, 'base64');
    callback(null, { content, headers: result.headers, statusCode: result.statusCode });
  });
}

export default function getContent(endpoint: string): Promise<GetContentResult<Buffer>>;
export default function getContent(endpoint: string, encoding: BufferEncoding): Promise<GetContentResult<string>>;
export default function getContent(endpoint: string, callback: GetContentCallback<Buffer>): void;
export default function getContent(endpoint: string, encoding: BufferEncoding, callback: GetContentCallback<string>): void;
export default function getContent(endpoint: string, encodingOrCallback?: BufferEncoding | GetContentCallback<Buffer>, callback?: GetContentCallback<string>): void | Promise<GetContentResult<Buffer | string>> {
  let encoding: BufferEncoding | null = null;
  let cb: GetContentCallback<Buffer | string> | undefined;

  if (typeof encodingOrCallback === 'function') {
    cb = encodingOrCallback;
  } else if (encodingOrCallback) {
    encoding = encodingOrCallback;
    cb = callback;
  }

  if (typeof cb === 'function') {
    worker(endpoint, encoding, cb);
    return;
  }
  return new Promise((resolve, reject) => worker(endpoint, encoding, (err, result) => (err ? reject(err) : resolve(result))));
}
