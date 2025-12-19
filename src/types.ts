import type * as http from 'http';
import type { Readable } from 'stream';

export interface RequestOptions {
  timeout?: number;
}

export type GetContentResult<T> = { content: T; headers: Record<string, string | string[]>; statusCode: number };
export type GetContentCallback<T> = (err: Error | null, result?: GetContentResult<T>) => void;
export type GetContentOptions = RequestOptions;

export type GetFileResult = { path: string; headers: Record<string, string | string[]>; statusCode: number };
export type GetFileCallback = (err: Error | null, result?: GetFileResult) => void;
export type GetFileOptions = RequestOptions;

export type GetStreamCallback = (err: Error | null, stream?: Readable) => void;
export type GetStreamOptions = RequestOptions;

export type HeadCallback = (err: Error | null, response?: HeadResponse) => void;

export type HeadOptions = RequestOptions;

export interface HeadResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
}
