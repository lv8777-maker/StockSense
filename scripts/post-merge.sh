#!/usr/bin/env bash
set -euo pipefail

# Restore the exact dependency versions recorded in package-lock.json.
# This is safe to run repeatedly and does not require interactive input.
npm ci --no-audit --no-fund

# Ensure required package-to-points mappings exist after every merge. The seed
# is transactional and safe to run repeatedly, including before schema sync.
npm run seed:packages