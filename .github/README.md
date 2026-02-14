# CI/CD Pipeline Documentation

This directory contains the GitHub Actions workflows and configurations for the i-clavdivs monorepo.

## Workflows

### Main CI ([ci.yml](workflows/ci.yml))

Runs on every push and pull request to ensure code quality and correctness.

**Triggers:**

- Push to `main`, `develop`, or feature branches (`F-*`)
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Jobs:**

1. **Lint & Format Check** - Validates code formatting and runs linters
2. **Type Check** - Runs TypeScript type checking across all packages
3. **Test** - Runs test suites on Node.js 18 and 20
    - Generates coverage reports on Node 20
    - Uploads to Codecov (requires `CODECOV_TOKEN` secret)
4. **Build** - Compiles all packages and uploads artifacts
5. **CI Success** - Final check to ensure all jobs passed

**Optimizations:**

- Uses `concurrency` to cancel outdated runs
- Caches pnpm dependencies
- Runs jobs in parallel where possible
- Matrix strategy for testing multiple Node versions

### PR Checks ([pr-checks.yml](workflows/pr-checks.yml))

Additional validations specifically for pull requests.

**Jobs:**

1. **PR Title Validation** - Enforces conventional commit format
    - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
    - Subject must start with lowercase
2. **Changed Files Detection** - Identifies which packages were modified
3. **Affected Tests** - Runs tests for changed packages
4. **Bundle Size Check** - Reports build artifact sizes
5. **Dependency Review** - Scans for vulnerable dependencies

### Release ([release.yml](workflows/release.yml))

Handles package versioning and publishing.

**Triggers:**

- Push of version tags (`v*`)
- Manual workflow dispatch with version input

**Steps:**

1. Runs full test suite
2. Builds all packages
3. Creates GitHub Release with auto-generated notes
4. (Optional) Publishes to npm - currently commented out

**To enable npm publishing:**

1. Add `NPM_TOKEN` secret to repository
2. Uncomment the publish step in the workflow

### Auto-merge Dependabot ([auto-merge.yml](workflows/auto-merge.yml))

Automatically approves and merges minor/patch dependency updates from Dependabot.

**Behavior:**

- Only processes Dependabot PRs
- Waits for all CI checks to pass
- Auto-merges patch and minor updates
- Major updates require manual review

## Dependabot Configuration

[dependabot.yml](dependabot.yml) manages automated dependency updates:

- **npm dependencies** - Weekly updates on Mondays
    - Groups minor/patch updates together
    - Separate group for dev dependencies
    - Limit: 10 PRs max
- **GitHub Actions** - Weekly updates
    - Groups all action updates
    - Labeled with `github-actions`

## Code Ownership

[CODEOWNERS](CODEOWNERS) defines code review assignments:

- All files default to @blanta
- Package-specific ownership can be configured
- CI/CD files require review from repository owner

## Secrets Required

For full functionality, configure these repository secrets:

1. `CODECOV_TOKEN` (optional) - For uploading test coverage
2. `NPM_TOKEN` (optional) - For publishing packages to npm
3. `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Best Practices

1. **Branch Protection Rules** (recommended):
    - Require PR reviews before merging
    - Require status checks to pass (CI Success)
    - Require branches to be up to date
    - Enable auto-merge for approved PRs

2. **PR Guidelines**:
    - Use conventional commit format in titles
    - Keep PRs focused and atomic
    - Ensure all tests pass locally before pushing

3. **Release Process**:

    ```bash
    # Create and push a version tag
    git tag v1.0.0
    git push origin v1.0.0

    # Or use workflow dispatch from GitHub UI
    ```

4. **Local Development**:
    ```bash
    # Run the same checks that CI runs
    pnpm format:check  # Format check
    pnpm lint          # Linting
    pnpm typecheck     # Type checking
    pnpm test          # Tests
    pnpm build         # Build
    ```

## Troubleshooting

### CI Failures

**Lint/Format errors:**

```bash
pnpm format  # Auto-fix formatting
pnpm lint    # Check linting issues
```

**Type errors:**

```bash
pnpm typecheck  # See type errors locally
```

**Test failures:**

```bash
pnpm test       # Run tests
pnpm test:watch # Watch mode for debugging
```

### Dependabot Issues

If Dependabot PRs are not auto-merging:

1. Check that all CI checks pass
2. Verify the update is minor/patch (not major)
3. Ensure GitHub Actions permissions are correct

### Release Issues

If releases fail:

1. Verify tag format matches `v*` pattern
2. Check that all tests pass
3. Ensure version numbers are incremented properly

## Monitoring

- Check [Actions tab](../../actions) for workflow runs
- Review [Dependabot alerts](../../security/dependabot) for vulnerabilities
- Monitor [Code scanning](../../security/code-scanning) if enabled
