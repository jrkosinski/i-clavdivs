# CI/CD Pipeline Setup

This document provides a quick overview of the CI/CD pipeline configured for this project.

## Overview

A comprehensive GitHub Actions-based CI/CD pipeline has been set up for this TypeScript monorepo. The pipeline handles code quality checks, testing, building, dependency management, and releases.

## Workflows

### 1. Main CI Workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml))

Automatically runs on every push and pull request.

**What it does:**

- Checks code formatting with Prettier
- Runs linters (when configured)
- Performs TypeScript type checking
- Runs test suites on Node.js 18 and 20
- Generates code coverage reports
- Builds all packages
- Uploads build artifacts

**Triggers:**

- Push to `main`, `develop`, or feature branches (`F-*`)
- Pull requests to `main` or `develop`
- Manual trigger via GitHub UI

### 2. PR Checks Workflow ([.github/workflows/pr-checks.yml](.github/workflows/pr-checks.yml))

Additional validation for pull requests.

**What it does:**

- Validates PR title follows conventional commit format
- Detects which packages changed
- Runs tests only for affected packages
- Checks bundle sizes and reports them
- Reviews dependencies for vulnerabilities

**PR Title Format:**

```
<type>: <description>
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### 3. Release Workflow ([.github/workflows/release.yml](.github/workflows/release.yml))

Handles versioning and publishing.

**To create a release:**

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or trigger manually from GitHub Actions UI
```

**What it does:**

- Runs full test suite
- Builds all packages
- Creates GitHub Release with auto-generated notes
- (Optional) Publishes to npm when configured

### 4. Auto-merge Dependabot ([.github/workflows/auto-merge.yml](.github/workflows/auto-merge.yml))

Automatically handles dependency updates.

**What it does:**

- Auto-approves minor/patch updates from Dependabot
- Waits for CI to pass
- Auto-merges safe updates
- Requires manual review for major updates

## Dependabot Configuration

[.github/dependabot.yml](.github/dependabot.yml) manages automated dependency updates:

- npm packages updated weekly on Mondays
- GitHub Actions updated weekly
- Groups minor/patch updates together
- Separate handling for dev dependencies

## Local Development

Run the same checks that CI runs:

```bash
# Format checking
pnpm format:check    # Check formatting
pnpm format          # Auto-fix formatting

# Type checking
pnpm typecheck

# Testing
pnpm test            # Run all tests
pnpm test:watch      # Watch mode

# Building
pnpm build           # Build all packages
```

## Required Secrets

For full functionality, add these secrets to your GitHub repository:

1. **CODECOV_TOKEN** (optional)
    - For uploading test coverage to Codecov
    - Get from [codecov.io](https://codecov.io)

2. **NPM_TOKEN** (optional)
    - For publishing packages to npm
    - Create at [npmjs.com](https://www.npmjs.com/settings/~/tokens)
    - Requires "Automation" token type

## Recommended Branch Protection Rules

Enable these in GitHub repository settings → Branches:

1. **Require pull request reviews before merging**
    - Require 1 approval
    - Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass before merging**
    - Require branches to be up to date
    - Required checks:
        - `CI Success`
        - `Lint & Format Check`
        - `Type Check`
        - `Test`
        - `Build`

3. **Require conversation resolution before merging**

4. **Do not allow bypassing the above settings**

## Enabling npm Publishing

To enable automatic publishing to npm:

1. Create an npm automation token:

    ```bash
    npm login
    npm token create --type=automation
    ```

2. Add the token as `NPM_TOKEN` secret in GitHub repository settings

3. Edit [.github/workflows/release.yml](.github/workflows/release.yml):
    - Uncomment the "Publish to npm" step

4. Ensure packages have correct `publishConfig` in their package.json:
    ```json
    {
        "publishConfig": {
            "access": "public"
        }
    }
    ```

## Monitoring

- **Workflow runs**: [Actions tab](../../actions)
- **Dependabot alerts**: [Security → Dependabot](../../security/dependabot)
- **Code scanning**: [Security → Code scanning](../../security/code-scanning)

## Next Steps

1. **Enable branch protection rules** (see above)
2. **Add repository secrets** (if using Codecov or npm publishing)
3. **Configure team permissions** via CODEOWNERS
4. **Set up Codecov** (optional but recommended)
5. **Test the pipeline** by creating a test PR

## Documentation

For detailed information about each workflow and troubleshooting, see [.github/README.md](.github/README.md).

## Architecture Decisions

- **pnpm workspace**: Efficient monorepo package management
- **Matrix testing**: Tests on Node.js 18 and 20 for compatibility
- **Parallel jobs**: Lint, typecheck, and test run in parallel for speed
- **Artifact caching**: Build artifacts cached for 7 days
- **Auto-merge**: Safe Dependabot updates merged automatically
- **Conventional commits**: Enforced for consistent changelog generation
