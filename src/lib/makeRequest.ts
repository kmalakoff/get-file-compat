import * as http from 'http';
import * as https from 'https';

const URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

export interface RequestOptions {
  method?: 'GET' | 'HEAD';
  timeout?: number;
}

export type RequestCallback = (err: Error | null, response?: http.IncomingMessage) => void;

export default function makeRequest(endpoint: string, callback: RequestCallback): void;
export default function makeRequest(endpoint: string, options: RequestOptions, callback: RequestCallback): void;
export default function makeRequest(endpoint: string, optionsOrCallback: RequestOptions | RequestCallback, callback?: RequestCallback): void {
  const options: RequestOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : (callback as RequestCallback);

  // url.parse replacement
  const match = URL_REGEX.exec(endpoint);
  const parsed = match ? { protocol: match[1], host: match[4], path: (match[5] || '') + (match[6] || '') } : null;
  const protocol = parsed?.protocol ?? '';
  const host = parsed?.host ?? '';
  const pathname = parsed?.path ?? '';

  if (!host) return cb(new Error(`Invalid URL: no host in '${endpoint}'`));

  const secure = protocol === 'https:';
  const method = options.method || 'GET';
  const requestOptions = { host, path: pathname, port: secure ? 443 : 80, method };
  const req = secure ? https.request(requestOptions) : http.request(requestOptions);

  let called = false;
  const end = (err: Error | null, res?: http.IncomingMessage) => {
    if (called) return;
    called = true;
    cb(err, res);
  };

  if (options.timeout) {
    req.setTimeout(options.timeout, () => {
      req.abort();
      end(new Error(`Request timeout after ${options.timeout}ms`));
    });
  }

  req.on('response', (res) => {
    // Follow 3xx redirects
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume(); // Discard response
      return makeRequest(res.headers.location, options, cb);
    }

    end(null, res);
  });
  req.on('error', end);
  req.end();
}
