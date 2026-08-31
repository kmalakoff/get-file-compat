import assert from 'assert';
import getFile, { getContent, getFile as getFileNamed, getStream, head } from 'get-file-compat';

describe('exports .mjs', () => {
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
