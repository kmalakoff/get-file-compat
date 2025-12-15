import oo from 'on-one';
import type { Readable } from 'stream';

export type CollectCallback = (err: Error | null, buffer?: Buffer) => void;

export default function collectBuffer(stream: Readable, callback: CollectCallback): void {
  const chunks: Buffer[] = [];

  stream.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  oo(stream, ['error', 'end', 'close', 'finish'], (err?: Error) => {
    if (err) return callback(err);
    callback(null, Buffer.concat(chunks));
  });
}
