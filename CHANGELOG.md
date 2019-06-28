# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Support for verification of a number via voice call (in addition to SMS)
- Prometheus metrics exposed on `METRICS_HOST:METRICS_PORT/metrics`, useful for operational monitoring

### Changed

- API is more forgiving when users enter numbers or verification codes with
  spaces or punctuation
- Staging server warning is consistently and properly applied
- Better error handling when Signal API returns errors

### Removed

n/a

## [0.0.1] - 2019-01-21

### Added

- Initial release of sigarillo

[unreleased]: https://gitlab.com/digiresilience/link/sigarillo/compare/0.0.1...master
[0.0.1]: https://gitlab.com/digiresilience/link/sigarillo/commits/0.0.1
