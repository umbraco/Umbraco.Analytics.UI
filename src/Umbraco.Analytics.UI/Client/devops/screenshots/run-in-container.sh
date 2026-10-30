#!/bin/sh
# Runs the Chromium screenshot specs inside the pinned Playwright Linux image, so the baselines
# (`*-chromium-linux.png`) are rendered the same on every machine and in CI.
#   npm run test:screenshots           compare against the committed baselines
#   npm run test:screenshots:update    rewrite the baselines (review the images before committing)
#
# The image tag must match the `playwright` version in package-lock.json, and the `container:` image in
# .github/workflows/storybook.yml and azure-pipelines.yml. Bump all of them together.
set -eu

IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"
CLIENT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_DIR="$(cd "$CLIENT_DIR/../../.." && pwd)"
CLIENT_REL="${CLIENT_DIR#"$REPO_DIR"/}"

# The container needs its own Linux node_modules, so a named volume hides the host's (macOS) copy.
docker run --rm \
    -v "$REPO_DIR":/work \
    -v uax-client-node-modules:"/work/$CLIENT_REL/node_modules" \
    -w "/work/$CLIENT_REL" \
    -e CI=true \
    -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
    "$IMAGE" \
    sh -c '
        npm ci --no-fund --no-audit --prefer-offline &&
        npx vitest run --project chromium "$@";
        status=$?
        # Hand the written baselines back to the host user.
        find src -type d -name __screenshots__ -exec chown -R "$HOST_UID:$HOST_GID" {} +
        chown -R "$HOST_UID:$HOST_GID" .vitest test-results 2>/dev/null || true
        exit $status
    ' sh "$@"
