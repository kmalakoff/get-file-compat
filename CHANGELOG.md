# Changelog

All notable changes to get-file-compat are documented here.

## [2.4.6] - 2026-11-22

### Fixed

- `getContent` now reports a response that is cut off part-way as an error. On Node 4 to 14 it used to return the partial body as a success. On Node 16 and later a cut-off used to fail with `aborted` (code `ECONNRESET`); it now fails with the message `Response aborted before the download completed`, the same as `getFile`.

## [2.4.5]

### Changed

- The final rename of a downloaded file into place is done by the `staged-cache` package (now a dependency). A refused rename still counts as a lost race only when a file is at the destination, and the temporary file is still removed on every outcome.
