---
name: PDF parser API
description: Compatibility rule for extracting text with the project's installed PDF parser.
---

Use the installed PDF parser through its class-based API and always destroy the parser after extraction; the legacy callable CommonJS export is unavailable.

**Why:** The dependency can compile against legacy community typings while failing at runtime because the installed major version exports a parser class instead of a function.

**How to apply:** When adding or changing PDF text extraction, verify the runtime export shape and run a real generated-PDF processing test in addition to TypeScript checks.