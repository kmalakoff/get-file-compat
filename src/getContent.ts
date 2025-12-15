import * as Module from 'module';
import oo from 'on-one';
import { bufferFrom } from './compat.ts';
import makeRequest from './lib/makeRequest.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

let execPath = null; // break dependencies
let functionExec = null; // break dependencies

import type { GetContentCallback, GetContentResult } from './types.ts';

function worker(endpoint: string, encoding: BufferEncoding | null, callback: GetContentCallback<Buffer | string>): void {
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
      // Pass actual encoding, or 'base64' for binary-safe Buffer transfer
      const workerEncoding = encoding || 'base64';
      const result = functionExec({ execPath, callbacks: true }, __filename, endpoint, workerEncoding);
      // If user wanted Buffer, convert from base64; otherwise use string directly
      const content = encoding ? result.content : bufferFrom(result.content, 'base64');
      callback(null, { content, headers: result.headers, statusCode: result.statusCode });
    } catch (err) {
      callback(err);
    }
    return;
  }

  // Modern Node - fetch directly
  makeRequest(endpoint, (err, res) => {
    if (err) return callback(err);

    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    res;
    oo(res, ['error', 'end', 'close', 'finish'], (err?: Error) => {
      if (err) return callback(err);
      const buffer = Buffer.concat(chunks);
      const content = encoding ? buffer.toString(encoding) : buffer;
      callback(null, { content, headers: res.headers, statusCode: res.statusCode });
    });
  });
}

// Overloads matching Node's fs.readFileSync pattern
export default function getContent(endpoint: string): Promise<GetContentResult<Buffer>>;
export default function getContent(endpoint: string, encoding: BufferEncoding): Promise<GetContentResult<string>>;
export default function getContent(endpoint: string, callback: GetContentCallback<Buffer>): void;
export default function getContent(endpoint: string, encoding: BufferEncoding, callback: GetContentCallback<string>): void;
export default function getContent(endpoint: string, encodingOrCallback?: BufferEncoding | GetContentCallback<Buffer>, callback?: GetContentCallback<string>): undefined | Promise<GetContentResult<Buffer | string>> {
  // Normalize arguments
  let encoding: BufferEncoding | null = null;
  let cb: GetContentCallback<Buffer | string> | undefined;

  if (typeof encodingOrCallback === 'function') {
    cb = encodingOrCallback;
  } else if (encodingOrCallback) {
    encoding = encodingOrCallback;
    cb = callback;
  }

  if (typeof cb === 'function') {
    return worker(endpoint, encoding, cb) as undefined;
  }

  return new Promise((resolve, reject) => {
    worker(endpoint, encoding, (err, result) => (err ? reject(err) : resolve(result)));
  });
}
