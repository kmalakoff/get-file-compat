import * as http from 'http';
import * as https from 'https';

const URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

export type RequestCallback = (err: Error | null, response?: http.IncomingMessage) => void;

export default function makeRequest(endpoint: string, callback: RequestCallback): void {
  const options = {};

  // url.parse replacement
  const parsed = URL_REGEX.exec(endpoint);
  const protocol = parsed[1];
  const host = parsed[4];
  const path = parsed[5] + (parsed[6] || '');

  const secure = protocol === 'https:';
  const requestOptions = { host, path, port: secure ? 443 : 80, method: 'GET', ...options };
  const req = secure ? https.request(requestOptions) : http.request(requestOptions);

  let called = false;
  const end = (err: Error | null, res?: http.IncomingMessage) => {
    if (called) return;
    called = true;
    callback(err, res);
  };

  req.on('response', (res) => {
    // Follow 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume(); // Discard response
      return makeRequest(res.headers.location, callback);
    }

    // Not successful
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.resume(); // Discard response
      return end(new Error(`Response code ${res.statusCode} (${http.STATUS_CODES[res.statusCode]})`));
    }

    end(null, res);
  });
  req.on('error', end);
  req.end();
}
