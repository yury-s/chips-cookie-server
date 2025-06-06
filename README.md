# Cookie Server

A test server for experimenting with [CHIPS](https://github.com/privacycg/CHIPS) (Cookies Having Independent Partitioned State) behavior across different origins and frames. Particularly useful for testing Safari 18.4+ which [added support](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes#Networking) for partitioned cookies.

## Features

- Tests CHIPS cookie behavior across different origins (localhost and 127.0.0.1)
- Demonstrates cookie handling in various scenarios:
  - Direct cookie access
  - Frame-based cookie access
  - Nested frame cookie access
- Supports both partitioned and non-partitioned cookies
- Includes a web interface for running tests

## Prerequisites

- Node.js (with ESM support)
- OpenSSL (for local development)

## Usage

### Local Development

```bash
npm install
node cookie-server.js --local
```

This starts the server on https://localhost:3000 and https://127.0.0.1:3000.

### Azure Deployment

```bash
node cookie-server.js
```

## Test Scenarios

The web interface provides tests for:
- Reading cookies across different origins and frame hierarchies
- Setting cookies with and without the `Partitioned` attribute
- Testing cookie behavior in nested frames

All cookies are set with `SameSite=None` and `Secure` flag.
