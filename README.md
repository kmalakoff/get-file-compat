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

### Download into memory

`getContent` downloads into memory instead of a file. It returns a `Buffer`, or a string when you pass an encoding, and it returns the whole body or an error: a response cut off part-way is an error, never a partial body. A non-2xx response is not an error; check `statusCode`.

```javascript
import { getContent } from 'get-file-compat';

const { content, statusCode } = await getContent('https://registry.npmjs.org/-/package/npm/dist-tags', 'utf8');
console.log(statusCode, JSON.parse(content));
```

Callback form:

```javascript
getContent('https://registry.npmjs.org/-/package/npm/dist-tags', 'utf8', function (err, result) {
  if (err) throw err;
  console.log(result.statusCode, JSON.parse(result.content));
});
```

### API

- `getFile(url, destination[, options], callback)` saves the response and returns `{ path, headers, statusCode }`.
- `getContent(url[, encoding][, options], callback)` downloads into memory and returns `{ content, headers, statusCode }`; `content` is a `Buffer`, or a string when an encoding is given.
- `getStream(url[, options], callback)` returns the response as a readable stream.
- `head(url[, options], callback)` returns `{ statusCode, headers }` without downloading the body.

Each function also has a promise form where supported by the runtime.
