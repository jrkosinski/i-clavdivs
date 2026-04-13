#!/bin/bash
#
# Start the i-clavdivs Discord daemon with multi-bot support
#
# This script sets up environment variables for multiple Discord bots
# Each bot has its own token and workspace directory (configured in config/default.json)

# Unset the problematic environment variables
unset DISCORD_ALLOWED_CHANNELS
unset DISCORD_ALLOWED_USERS

# Note: Environment variables are loaded from .env file by the CLI application
# No need to export them here - dotenv will handle it

# Optional: Set these if you want to override config/default.json
# export DISCORD_REQUIRE_MENTION="true"

echo "Starting i-clavdivs daemon with multi-bot support..."
echo ""
echo "Bot configuration:"
echo "  Tokens: Loaded from .env file"
echo "  Workspaces: Configured in config/default.json"
echo "    - alan-watts: /home/blanta/.i-clavdivs/workspace-alan-watts"
echo "    - conan: /home/blanta/.i-clavdivs/workspace-conan"
echo ""

# Start the daemon - workspace dirs are now configured per-bot in config/default.json
# Change to monorepo root so config file can be found
cd "$(dirname "$0")/../.."
pnpm daemon
