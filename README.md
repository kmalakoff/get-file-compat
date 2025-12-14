## get-file-compat

Get a file from a URL and save it to disk.

### Installation

```bash
npm install get-file-compat
```

### Usage

```javascript
import path from 'path';
import os from 'os';
import getFile from 'get-file-compat';

const filePath = await getFile('https://nodejs.org/dist/v24.12.0/SHASUMS256.txt', path.join(os.tempDir(), 'SHASUMS256.txt'));
```
