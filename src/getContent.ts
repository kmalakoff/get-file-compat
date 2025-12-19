import { bind } from 'node-version-call-local';
import oo from 'on-one';
import path from 'path';
import url from 'url';
import { bufferFrom } from './compat.ts';
import makeRequest from './lib/makeRequest.ts';

import type { GetContentCallback, GetContentOptions, GetContentResult } from './types.ts';

const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const workerPath = path.join(__dirname, '..', 'cjs', 'getContent.js');

function run(endpoint: string, encoding: BufferEncoding | null, options: GetContentOptions, callback: GetContentCallback<Buffer | string>) {
  makeRequest(endpoint, { timeout: options.timeout }, (err, res) => {
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

// spawnOptions: false - no node/npm spawn (network only)
const call = bind('>0', workerPath, { callbacks: true, spawnOptions: false });

function worker(endpoint: string, encoding: BufferEncoding | null, options: GetContentOptions, callback: GetContentCallback<Buffer | string>) {
  if (!noHTTPS) {
    run(endpoint, encoding, options, callback);
    return;
  }
  const enc = encoding || 'base64';
  call(endpoint, enc, options, (err: Error | null, result: GetContentResult<string>) => {
    if (err) return callback(err);
    const content = encoding ? result.content : bufferFrom(result.content, 'base64');
    callback(null, { content, headers: result.headers, statusCode: result.statusCode });
  });
}

export default function getContent(endpoint: string): Promise<GetContentResult<Buffer>>;
export default function getContent(endpoint: string, options: GetContentOptions): Promise<GetContentResult<Buffer>>;
export default function getContent(endpoint: string, encoding: BufferEncoding): Promise<GetContentResult<string>>;
export default function getContent(endpoint: string, encoding: BufferEncoding, options: GetContentOptions): Promise<GetContentResult<string>>;
export default function getContent(endpoint: string, callback: GetContentCallback<Buffer>): void;
export default function getContent(endpoint: string, options: GetContentOptions, callback: GetContentCallback<Buffer>): void;
export default function getContent(endpoint: string, encoding: BufferEncoding, callback: GetContentCallback<string>): void;
export default function getContent(endpoint: string, encoding: BufferEncoding, options: GetContentOptions, callback: GetContentCallback<string>): void;
export default function getContent(endpoint: string, encodingOrOptionsOrCallback?: BufferEncoding | GetContentOptions | GetContentCallback<Buffer>, optionsOrCallback?: GetContentOptions | GetContentCallback<Buffer | string>, callback?: GetContentCallback<string>): void | Promise<GetContentResult<Buffer | string>> {
  let encoding: BufferEncoding | null = null;
  let options: GetContentOptions = {};
  let cb: GetContentCallback<Buffer | string> | undefined;

  // Parse arguments
  if (typeof encodingOrOptionsOrCallback === 'function') {
    cb = encodingOrOptionsOrCallback;
  } else if (typeof encodingOrOptionsOrCallback === 'string') {
    encoding = encodingOrOptionsOrCallback;
    if (typeof optionsOrCallback === 'function') {
      cb = optionsOrCallback;
    } else if (optionsOrCallback) {
      options = optionsOrCallback;
      cb = callback;
    }
  } else if (encodingOrOptionsOrCallback) {
    options = encodingOrOptionsOrCallback;
    if (typeof optionsOrCallback === 'function') {
      cb = optionsOrCallback;
    }
  }

  if (typeof cb === 'function') {
    worker(endpoint, encoding, options, cb);
    return;
  }
  return new Promise((resolve, reject) => worker(endpoint, encoding, options, (err, result) => (err ? reject(err) : resolve(result))));
}
