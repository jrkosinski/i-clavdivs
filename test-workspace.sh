#!/bin/bash
#
# Test script for workspace bootstrap system
#

set -e

echo "================================"
echo "Workspace Bootstrap System Test"
echo "================================"
echo ""

#check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY is not set"
    echo ""
    echo "Please set your API key:"
    echo "  export ANTHROPIC_API_KEY='your-key-here'"
    echo ""
    exit 1
fi

echo "✓ API key found"

#check workspace files
echo ""
echo "Checking workspace files..."
WORKSPACE_DIR="$HOME/.i-clavdivs/workspace"

if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "  Creating workspace directory..."
    mkdir -p "$WORKSPACE_DIR"
fi

if [ ! -f "$WORKSPACE_DIR/SOUL.md" ]; then
    echo "  Copying example workspace files..."
    cp examples/workspace/*.md "$WORKSPACE_DIR/"
fi

echo "✓ Workspace files:"
ls -1 "$WORKSPACE_DIR"

#build if needed
echo ""
echo "Building CLI..."
cd apps/cli && pnpm build > /dev/null 2>&1 && cd ../..
echo "✓ CLI built"

#run test
echo ""
echo "================================"
echo "Running Test Prompt"
echo "================================"
echo ""
echo "Prompt: 'Hello! Please introduce yourself briefly using your Clavdivs persona.'"
echo ""
echo "Response:"
echo "--------------------------------"

node ./apps/cli/dist/index.js "Hello! Please introduce yourself briefly using your Clavdivs persona. Keep it to 2-3 sentences."

echo ""
echo "--------------------------------"
echo ""
echo "✓ Test complete!"
echo ""
echo "The agent should have responded with the Clavdivs persona defined in SOUL.md"
echo ""
