## get-file-compat

Get a file from a URL and save it to disk.

### Installation

```bash
npm install get-file-compat
```

### Usage

```javascript
var path = require('path');
var os = require('os');
var getFile = require('get-file-compat');

getFile('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', path.join(os.tmpdir(), 'SHASUMS256.txt'), function (err, result) {
  if (err) throw err;
  console.log(result.path);
});
```

The callback result includes the saved `path`, response `headers`, and `statusCode`. The promise form is also available on current Node.js versions.

### API

- `getFile(url, destination[, options], callback)` saves the response and returns `{ path, headers, statusCode }`.
- `getContent(url[, encoding][, options], callback)` returns response content and metadata.
- `getStream(url[, options], callback)` returns the response as a readable stream.
- `head(url[, options], callback)` returns `{ statusCode, headers }` without downloading the body.

Each function also has a promise form where supported by the runtime.
