#!/bin/bash
#
# Start the i-clavdivs Discord daemon with clean environment
#
# This script removes the problematic DISCORD_ALLOWED_* env vars
# that have placeholder values instead of real Discord IDs

# Unset the problematic environment variables
unset DISCORD_ALLOWED_CHANNELS
unset DISCORD_ALLOWED_USERS

# Keep only the required env vars
export DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Optional: Set these if you want to override config/default.json
# export DISCORD_REQUIRE_MENTION="true"

echo "Starting i-clavdivs daemon with clean environment..."
echo "Environment variables:"
echo "  DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN:0:20}..."
echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+[set]}"
echo "  DISCORD_ALLOWED_CHANNELS: ${DISCORD_ALLOWED_CHANNELS:-[not set - using config file]}"
echo "  DISCORD_ALLOWED_USERS: ${DISCORD_ALLOWED_USERS:-[not set - using config file]}"
echo "  WORKSPACE_DIR: ./workspace"
echo ""

# Start the daemon with workspace directory pointing to project workspace
# Change to monorepo root so config file can be found
cd "$(dirname "$0")/../.."
pnpm daemon -- --workspace-dir ./workspace
