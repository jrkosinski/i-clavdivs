# Models Package Tests

This directory contains comprehensive automated tests for the `@i-clavdivs/models` package.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── auth/               # Authentication utilities tests
│   │   └── api-key.test.ts
│   └── core/               # Core abstractions tests
│       ├── model.test.ts
│       └── provider.test.ts
├── integration/             # Integration tests with mocked APIs
│   └── providers/
│       ├── openai.test.ts
│       └── anthropic.test.ts
└── fixtures/                # Test data and mock responses
    ├── mock-responses.ts
    └── test-data.ts
```

## Coverage

Current test coverage: **93%**

- Auth utilities: 100%
- Core abstractions: 98%
- Provider implementations: 91%

## Running Tests

### Run all tests
```bash
pnpm test
```

### Watch mode (re-run tests on file changes)
```bash
pnpm test:watch
```

### Run with UI
```bash
pnpm test:ui
```

### Generate coverage report
```bash
pnpm test:coverage
```

## Test Categories

### Unit Tests (86 tests)

#### Auth Utilities (`api-key.test.ts`)
- Environment variable loading
- Auth credential creation (API key, bearer token)
- API key validation (format, length, prefix)
- API key masking for logs

#### Base Model (`model.test.ts`)
- Model definition management
- Request validation (messages, maxTokens, temperature, topP)
- Cost calculation
- Deep copy verification

#### Base Provider & Registry (`provider.test.ts`)
- Provider configuration management
- Model registration and retrieval
- Authentication updates
- Header building for different auth types
- Provider registry operations

### Integration Tests (43 tests)

#### OpenAI Provider (`openai.test.ts`)
- Model initialization and configuration
- Completion requests (simple, with tools, with images)
- Streaming responses
- Request/response format conversion
- Error handling
- Finish reason mapping

#### Anthropic Provider (`anthropic.test.ts`)
- Model initialization and configuration
- Message completion (with system messages, tools, images)
- Streaming responses
- Header format (x-api-key, anthropic-version)
- Tool use handling
- Stop reason mapping

## Test Fixtures

### Mock Responses (`mock-responses.ts`)
Provides realistic API responses for:
- OpenAI Chat Completions (success, tool calls, cached tokens, streaming)
- Anthropic Messages (success, tool use, cached tokens, streaming)
- Error responses

### Test Data (`test-data.ts`)
Provides reusable test data:
- Model definitions
- Provider configurations
- Completion requests (simple, with tools, with images, etc.)

## Writing New Tests

### Example: Testing a new utility function

```typescript
import { describe, it, expect } from 'vitest';
import { myNewFunction } from '../../../src/utils/my-util.js';

describe('myNewFunction', () => {
    it('should handle valid input', () => {
        const result = myNewFunction('input');
        expect(result).toBe('expected output');
    });

    it('should throw on invalid input', () => {
        expect(() => myNewFunction(null)).toThrow('error message');
    });
});
```

### Example: Testing with mocked fetch

```typescript
import { vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse } from '../../fixtures/mock-responses.js';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
});

afterEach(() => {
    vi.restoreAllMocks();
});

it('should make API call', async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ data: 'test' }));

    // Test code that uses fetch
    // ...

    expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/endpoint'),
        expect.objectContaining({ method: 'POST' })
    );
});
```

## Future Test Additions

### Real API Integration Tests (separate from unit tests)
For testing with actual API endpoints:
- Create a separate `tests/e2e/` directory
- Use environment variables for real API keys
- Run only when explicitly requested (not in CI)
- Test rate limiting, retries, and error recovery

### Performance Tests
- Token counting accuracy
- Cost calculation precision
- Stream parsing performance
- Memory usage with large contexts

### Edge Cases
- Very large token counts
- Unicode and special characters
- Malformed API responses
- Network timeouts and retries

## Notes

- All tests use mocked HTTP requests via `vi.fn()` - no real API calls are made
- Tests are isolated and can run in any order
- Coverage reports are generated in `coverage/` directory
- Tests follow the Arrange-Act-Assert pattern
