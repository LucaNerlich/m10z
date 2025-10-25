# Project Guidelines – M10Z

This document gives Junie a quick, reliable overview of the M10Z project and how to work within it.

## Project overview

<!-- TOC -->
* [Project Guidelines – M10Z](#project-guidelines--m10z)
  * [Project overview](#project-overview)
  * [Project structure (high level)](#project-structure-high-level)
  * [Prerequisites](#prerequisites)
  * [Install, run, and build](#install-run-and-build)
  * [Tests and verification](#tests-and-verification)
  * [Code style and conventions](#code-style-and-conventions)
  * [Submission checklist for Junie](#submission-checklist-for-junie)
<!-- TOC -->

M10Z (Mindestens 10 Zeichen) is a German gaming and technology blog built with Docusaurus 3, React 19, and TypeScript.
Content is written in MDX and organized into blogs and podcasts. The repository includes small Node scripts to generate
supporting data:

- generateAuthorsJson.js converts blog/authors.yml to blog/authors.json
- generateAudioFeed.js builds a podcast feed placed under static/

Key characteristics:

- Static site built with Docusaurus 3
- TypeScript-first codebase (JS allowed for build scripts)
- Local search, PWA, image optimization, and podcast audio feed

## Project structure (high level)

- blog/ — content (articles by category and podcasts); authors.yml lives here
- src/ — React components, pages, styles, types
- static/ — static assets (img/, generated audio feed, etc.)
- templates/ — content templates
- scripts — top-level Node scripts: generateAuthorsJson.js, generateAudioFeed.js
- docusaurus.config.js — site configuration

For a more detailed tree, see the Project Structure section in README.md.

## Prerequisites

- Node.js 22+
- Package manager: the repo declares pnpm@10.15.1, but npm 11+ also works

Tip: Prefer pnpm if available to match the lockfile; otherwise use npm.

## Install, run, and build

Use one of the following, consistently within a session:

Using pnpm

- pnpm install
- pnpm run dev — generates data then starts Docusaurus dev server
- pnpm run build — generates data then builds the static site
- pnpm run serve — serves the production build locally
- pnpm run generate — runs both data generators
- pnpm run typecheck — TypeScript type checks

Using npm

- npm install
- npm run dev
- npm run build
- npm run serve (or npm run coolify to serve on port 3000)
- npm run generate
- npm run typecheck

Script details

- generateAuthors: node ./generateAuthorsJson.js (reads blog/authors.yml, writes blog/authors.json)
- generateAudioFeed: node ./generateAudioFeed.js (writes static/audiofeed.xml)

Optional Docker

- docker build -t m10z .

## Tests and verification

There is currently no automated test suite. Before submitting changes:

- Always run type checks: npm run typecheck or pnpm run typecheck
- For code or config changes: run a full build: npm run build or pnpm run build
- For content-only changes (MD/MDX): run the dev server to preview: npm run dev
- If you changed authors or audio feed logic/content: run npm run generate and verify that blog/authors.json and
  static/audiofeed.xml look correct

## Code style and conventions

- TypeScript throughout app code; small Node build scripts may be JS
- Keep formatting consistent with existing files (2-space indentation, semicolons as in current code)
- Prefer small, focused components and functions
- Avoid introducing additional dependencies unless necessary
- Place images under static/img and reference them via Docusaurus conventions

## Submission checklist for Junie

- The repository builds successfully (run build) when relevant
- Type checks pass (run typecheck)
- For feed/author changes, data is (re)generated and outputs verified
- No unrelated files are added; follow the existing structure
- Provide a short summary of changes in the submission
