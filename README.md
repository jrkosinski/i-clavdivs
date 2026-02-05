# i-clavdivs

A pnpm workspace monorepo.

## Structure

```
i-clavdivs/
├── apps/           # Applications (web apps, services, etc.)
├── packages/       # Shared packages and libraries
├── package.json    # Root package configuration
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint all packages
pnpm lint

# Format code
pnpm format
```

### Workspace Commands

```bash
# Add a dependency to a specific package
pnpm --filter <package-name> add <dependency>

# Run a command in a specific package
pnpm --filter <package-name> <command>

# Run a command in all packages
pnpm -r <command>
```

## Adding New Packages

To add a new package to the workspace:

1. Create a new directory in `packages/` or `apps/`
2. Add a `package.json` file with a unique name
3. The package will automatically be part of the workspace

Example package structure:

```
packages/my-package/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

## License

MIT
