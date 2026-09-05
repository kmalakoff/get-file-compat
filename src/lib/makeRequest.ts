import * as http from 'http';
import * as https from 'https';

const URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

export interface RequestOptions {
  method?: 'GET' | 'HEAD';
  timeout?: number;
}

export type RequestCallback = (err: NodeJS.ErrnoException | null, response?: http.IncomingMessage) => void;

export default function makeRequest(endpoint: string, callback: RequestCallback): void;
export default function makeRequest(endpoint: string, options: RequestOptions, callback: RequestCallback): void;
export default function makeRequest(endpoint: string, optionsOrCallback: RequestOptions | RequestCallback, callback?: RequestCallback): void {
  const options: RequestOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
  const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : (callback as RequestCallback);

  // url.parse replacement
  const match = URL_REGEX.exec(endpoint);
  const parsed = match ? { protocol: match[1], host: match[4], path: (match[5] || '') + (match[6] || '') } : null;
  const protocol = parsed?.protocol ?? '';
  const authority = parsed?.host ?? '';
  const pathname = parsed?.path ?? '';

  if (!authority) return cb(new Error(`Invalid URL: no host in '${endpoint}'`));

  // Split a trailing numeric port off the authority; a bare colon elsewhere (an IPv6 literal)
  // is out of scope since this package only ever targets named hosts.
  const portMatch = /^(.*):(\d+)$/.exec(authority);
  const host = portMatch ? portMatch[1] : authority;
  const secure = protocol === 'https:';
  const method = options.method || 'GET';
  const requestOptions = { host, path: pathname, port: portMatch ? +portMatch[2] : secure ? 443 : 80, method };
  const req = secure ? https.request(requestOptions) : http.request(requestOptions);

  let called = false;
  const end = (err: NodeJS.ErrnoException | null, res?: http.IncomingMessage) => {
    if (called) return;
    called = true;
    cb(err, res);
  };

  if (options.timeout) {
    req.setTimeout(options.timeout, () => {
      req.abort();
      // ETIMEDOUT matches the code Node itself uses for socket timeouts, so callers can
      // classify this the same way as any other timed-out connection.
      const err: NodeJS.ErrnoException = new Error(`Request timeout after ${options.timeout}ms`);
      err.code = 'ETIMEDOUT';
      end(err);
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
