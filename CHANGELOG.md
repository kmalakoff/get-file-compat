# Changelog

All notable changes to get-file-compat are documented here.

## [2.4.5]

### Changed

- The final rename of a downloaded file into place is done by the `staged-cache` package (now a dependency). A refused rename still counts as a lost race only when a file is at the destination, and the temporary file is still removed on every outcome.
