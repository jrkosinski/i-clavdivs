# @i-clavdivs/common

Common utilities and shared code for the i-clavdivs monorepo.

## Installation

```bash
pnpm add @i-clavdivs/common
```

## Usage

```typescript
import { isDefined, sleep, debounce } from '@i-clavdivs/common';
import type { DeepPartial, DeepRequired } from '@i-clavdivs/common';

// Utility functions
if (isDefined(someValue)) {
  // someValue is not null or undefined
}

await sleep(1000); // Wait 1 second

const debouncedFn = debounce(() => {
  console.log('Called!');
}, 300);

// Type utilities
type User = {
  id: string;
  name: string;
  email: string;
};

type PartialUser = DeepPartial<User>;
```

## Features

### Utilities
- `isDefined<T>()` - Type guard for non-nullable values
- `sleep()` - Promise-based sleep function
- `debounce()` - Debounce function calls

### Types
- `DeepPartial<T>` - Recursive partial type
- `DeepRequired<T>` - Recursive required type
- `KeysOfType<T, U>` - Extract keys by value type
- `PartialBy<T, K>` - Make specific keys optional
- `RequiredBy<T, K>` - Make specific keys required
- `Awaited<T>` - Unwrap Promise types

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```
