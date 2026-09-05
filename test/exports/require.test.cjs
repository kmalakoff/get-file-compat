const assert = require('assert');
const { default: getFile, getContent, getFile: getFileNamed, getStream, head } = require('get-file-compat');

describe('exports .cjs', () => {
  it('default', () => {
    assert.equal(typeof getFile, 'function');
  });
  it('getContent', () => {
    assert.equal(typeof getContent, 'function');
  });
  it('getFile', () => {
    assert.equal(typeof getFileNamed, 'function');
  });
  it('getStream', () => {
    assert.equal(typeof getStream, 'function');
  });
  it('head', () => {
    assert.equal(typeof head, 'function');
  });
});
