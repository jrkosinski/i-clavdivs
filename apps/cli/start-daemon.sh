#!/bin/bash
#
# Start the i-clavdivs Discord daemon with multi-bot support
#
# This script sets up environment variables for multiple Discord bots
# Each bot has its own token and workspace directory (configured in config/default.json)

# Unset the problematic environment variables
unset DISCORD_ALLOWED_CHANNELS
unset DISCORD_ALLOWED_USERS

# Set bot tokens - each bot needs its own token
export DISCORD_BOT_TOKEN_ALAN="${DISCORD_BOT_TOKEN_ALAN}"
export DISCORD_BOT_TOKEN_CONAN="${DISCORD_BOT_TOKEN_CONAN}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Optional: Set these if you want to override config/default.json
# export DISCORD_REQUIRE_MENTION="true"

echo "Starting i-clavdivs daemon with multi-bot support..."
echo "Environment variables:"
echo "  DISCORD_BOT_TOKEN_ALAN: ${DISCORD_BOT_TOKEN_ALAN:0:20}..."
echo "  DISCORD_BOT_TOKEN_CONAN: ${DISCORD_BOT_TOKEN_CONAN:0:20}..."
echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+[set]}"
echo ""
echo "Bot workspaces (from config/default.json):"
echo "  alan-watts: /home/blanta/.i-clavdivs/workspace-alan-watts"
echo "  conan: /home/blanta/.i-clavdivs/workspace-conan"
echo ""

# Start the daemon - workspace dirs are now configured per-bot in config/default.json
# Change to monorepo root so config file can be found
cd "$(dirname "$0")/../.."
pnpm daemon
