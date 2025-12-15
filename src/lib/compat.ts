import type { Readable } from 'stream';
import stream from 'stream';

// Buffer.from was added in Node 4.5.0, use new Buffer for older versions
export function bufferFrom(data: string, encoding: BufferEncoding): Buffer {
  if (typeof Buffer.from === 'function') {
    try {
      return Buffer.from(data, encoding);
    } catch (_err) {
      // Buffer.from(string) throws in Node 4.x for some cases, fall through
    }
  }
  // eslint-disable-next-line no-buffer-constructor
  return new Buffer(data, encoding);
}

// Readable.from was added in Node 12.3.0, create PassThrough for older versions
// Requires Node 0.10+ (when stream.Readable was added)
export function readableFrom(buffer: Buffer): Readable {
  const ReadableClass = stream.Readable;
  const PassThroughClass = stream.PassThrough;

  // Try Readable.from if available (Node 12.3.0+)
  if (ReadableClass && typeof ReadableClass.from === 'function') return ReadableClass.from(buffer);

  // Use PassThrough if available (Node 0.10+)
  if (PassThroughClass) {
    const pt = new PassThroughClass();
    // Use nextTick to ensure listeners can be attached before data is emitted
    process.nextTick(() => pt.end(buffer));
    return pt;
  }

  // Fallback for Node 0.10.x where PassThrough might not exist but Readable does
  if (ReadableClass) {
    const readable = new ReadableClass();
    readable._read = () => {};
    // Use nextTick to ensure listeners can be attached before data is emitted
    process.nextTick(() => {
      readable.push(buffer);
      readable.push(null);
    });
    return readable;
  }

  // Node < 0.10 - stream classes not available
  throw new Error('getStream requires Node 0.10 or higher. Use getContent instead.');
}
