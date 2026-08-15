# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-15

### Added

- Monorepo scaffolding with npm workspaces: `web` (React + TypeScript SPA via
  Vite), `server` (thin Node + TypeScript backend), and `shared` (shared
  TypeScript types, source-only, no build step).
- Shared types for player roles (P/D/C/A), league rules configuration, and the
  `Valuation` import schema.
- Minimal Express server with a `GET /health` endpoint.
- Placeholder web page rendering the application name.
- Strict TypeScript configuration, ESLint (flat config) and Prettier across
  all packages.
