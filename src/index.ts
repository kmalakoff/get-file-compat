import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as Module from 'module';
import oo from 'on-one';
import pump from 'pump';

const URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// node <= 0.8 does not support https and node 0.12 certs cannot be trusted
const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
const noHTTPS = major === 0 && (minor <= 8 || minor === 12);

let execPath = null; // break dependencies
let functionExec = null; // break dependencies
function worker(endpoint, dest, callback) {
  const options = {};

  // node <=0.8 does not support https
  if (noHTTPS) {
    if (!execPath) {
      const satisfiesSemverSync = _require('node-exec-path').satisfiesSemverSync;
      execPath = satisfiesSemverSync('>0'); // must be more than node 0.12
      if (!execPath) return callback(new Error('get-remote needs a version of node >0 to use https'));
    }

    try {
      if (!functionExec) functionExec = _require('function-exec-sync');
      const result = functionExec({ execPath, callbacks: true }, __filename, endpoint, dest);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
    return;
  }

  // url.parse replacement
  const parsed = URL_REGEX.exec(endpoint);
  const protocol = parsed[1];
  const host = parsed[4];
  const path = parsed[5];

  const secure = protocol === 'https:';
  const requestOptions = { host, path, port: secure ? 443 : 80, method: 'GET', ...options };
  const req = secure ? https.request(requestOptions) : http.request(requestOptions);

  let called = false;
  const end = (err, res?) => {
    if (called) return;
    called = true;
    callback(err, res);
  };

  req.on('response', (res) => {
    // Follow 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume(); // Discard response
      return worker(res.headers.location, dest, callback);
    }

    // Not successful
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.resume(); // Discard response
      return end(new Error(`Response code ${res.statusCode} (${http.STATUS_CODES[res.statusCode]})`));
    }
    res = pump(res, fs.createWriteStream(dest));
    oo(res, ['error', 'end', 'close', 'finish'], (err?: Error) => {
      err ? end(err) : end(null, dest);
    });
  });
  req.on('error', end);
  req.end();
}

export default function getFile(endpoint, dest, callback?): undefined | Promise<string> {
  if (typeof callback === 'function') return worker(endpoint, dest, callback) as undefined;
  return new Promise((resolve, reject) => worker(endpoint, dest, (err, dest) => (err ? reject(err) : resolve(dest))));
}
