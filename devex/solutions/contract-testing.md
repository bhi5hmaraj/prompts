# Solution: Contract Testing

## Overview

Use property-based and round-trip tests to verify that transformations maintain invariants across representations. Catch synchronization drift at test time with automatically generated test cases.

**Tier**: 2 (Makes Drift Expensive)

## Core Principle

If a transformation is correct, it should satisfy mathematical properties (identity, composition, invertibility). Generate tests that verify these properties hold for all inputs.

## When to Apply

- Existing codebase with manual transformations
- Complex business logic in conversions
- Need to refactor transformations confidently
- Supplementing type system enforcement or codegen

## Implementation Techniques

### 1. Round-Trip Testing

Verify conversions are invertible:

```typescript
import { test } from 'vitest';
import fc from 'fast-check';

test('form -> setup -> form is identity', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const setup = toGameSetup(form);
      const restored = fromGameSetup(setup);
      expect(restored).toEqual(form);
    })
  );
});
```

### 2. Schema Validation After Conversion

Ensure output satisfies target schema:

```typescript
test('toGameSetup produces valid GameSetup', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const setup = toGameSetup(form);
      const result = gameSetupSchema.safeParse(setup);
      expect(result.success).toBe(true);
    })
  );
});
```

### 3. Invariant Preservation

Check that conversions maintain business rules:

```typescript
test('stakeholder count preserved', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const setup = toGameSetup(form);
      expect(setup.actors.length).toBe(form.stakeholders.length);
    })
  );
});

test('validation constraints preserved', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const prompt = compileToPrompt(form);
      // Title appears in prompt
      expect(prompt).toContain(form.scenarioTitle);
      // All stakeholders represented
      form.stakeholders.forEach(s => {
        expect(prompt).toContain(s.name);
      });
    })
  );
});
```

### 4. Cross-Representation Consistency

Verify that different paths to same representation agree:

```typescript
test('form -> setup -> json equals form -> json', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const viaSetup = setupToJson(toGameSetup(form));
      const direct = formToJson(form);
      expect(viaSetup).toEqual(direct);
    })
  );
});
```

### 5. Arbitrary Generators

Generate random valid inputs using fast-check:

```typescript
const arbitraryStakeholder = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 50 }),
  role: fc.string({ minLength: 2, maxLength: 30 }),
  priorities: fc.string({ minLength: 5, maxLength: 200 }),
  constraints: fc.option(fc.string({ maxLength: 200 })),
});

const arbitraryForm = fc.record({
  scenarioTitle: fc.string({ minLength: 3, maxLength: 100 }),
  scenarioDescription: fc.string({ minLength: 10, maxLength: 500 }),
  coreMetric: fc.constantFrom(
    'Quality', 'Speed', 'Cost', 'Innovation',
    'Reliability', 'Security', 'User Satisfaction', 'Other'
  ),
  stakeholders: fc.array(arbitraryStakeholder, { maxLength: 6 }),
  maxRounds: fc.option(fc.integer({ min: 3, max: 10 })),
  comments: fc.dictionary(fc.string(), fc.string()),
});
```

## Integration Strategy

### Test Organization

```
tests/
  contracts/
    form-setup.test.ts      # Form ↔ GameSetup conversions
    form-prompt.test.ts     # Form → Prompt conversions
    invariants.test.ts      # Cross-cutting invariants
  generators/
    arbitrary.ts            # fast-check generators
```

### CI Pipeline

```json
// package.json
{
  "scripts": {
    "test:contracts": "vitest run tests/contracts",
    "test:contracts:watch": "vitest watch tests/contracts"
  }
}
```

### Coverage Requirements

```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      // Ensure all converters are tested
      include: ['src/converters/**/*.ts'],
      statements: 95,
      branches: 90,
      functions: 95,
    }
  }
}
```

## Verification

### Example Test Suite

```typescript
describe('Form ↔ GameSetup contract', () => {
  test('round-trip preserves data', () => {
    fc.assert(fc.property(arbitraryForm, (form) => {
      expect(fromGameSetup(toGameSetup(form))).toEqual(form);
    }));
  });

  test('output satisfies schema', () => {
    fc.assert(fc.property(arbitraryForm, (form) => {
      const setup = toGameSetup(form);
      expect(gameSetupSchema.safeParse(setup).success).toBe(true);
    }));
  });

  test('field mappings', () => {
    fc.assert(fc.property(arbitraryForm, (form) => {
      const setup = toGameSetup(form);
      expect(setup.title).toBe(form.scenarioTitle);
      expect(setup.metric).toBe(form.coreMetric);
      expect(setup.actors.length).toBe(form.stakeholders.length);
    }));
  });

  test('default values handled', () => {
    const minimalForm = { /* only required fields */ };
    const setup = toGameSetup(minimalForm);
    expect(setup.rounds).toBe(5); // default
  });
});
```

### Mutation Testing

Verify tests actually catch errors:

```bash
# Use Stryker or similar
npx stryker run
```

Mutate converter code and ensure tests fail.

## AI Collaboration

### Prompt Template

```
Add [field] to CustomScenarioForm.

IMPORTANT: After updating converters, add contract tests in tests/contracts/:
1. Update arbitraryForm generator to include new field
2. Verify round-trip tests still pass
3. Add specific test for new field's transformation logic
4. Run `pnpm test:contracts` before marking complete

Example:
test('new field preserved in conversion', () => {
  fc.assert(fc.property(arbitraryForm, (form) => {
    const setup = toGameSetup(form);
    expect(setup.newField).toBe(form.newField);
  }));
});
```

### Test-Driven Workflow

1. Write failing contract test for new field
2. Update schema
3. Update converters until tests pass
4. Verify all existing tests still pass

## Trade-offs

**Pros:**
- Catches logical errors types can't (e.g., wrong field mapping)
- Tests hundreds of cases automatically
- Documents expected behavior
- Enables confident refactoring

**Cons:**
- Only catches drift at test time (not compile time)
- Requires writing generators (boilerplate)
- May not catch all edge cases
- Slower than type checking

## Success Metrics

You've successfully implemented this solution when:

- Schema changes that break conversions fail tests
- Contract tests run on every commit (CI)
- 100+ test cases run per property check
- Tests catch bugs before production

## Common Pitfalls

1. **Generators don't match schema** - Tests pass with invalid data
2. **Not testing edge cases** - Min/max values, empty arrays, etc.
3. **Tests too specific** - Brittle, fail on valid refactors
4. **No CI integration** - Tests not run consistently

## Related Solutions

- **Schema-Driven Codegen** - Generate transformations that pass these tests by construction
- **Type System Enforcement** - Catch structural issues at compile time
- **Static Verification** - Prove properties mathematically

## Tools & Libraries

- **fast-check** (TypeScript) - Property-based testing
- **Hypothesis** (Python) - Property-based testing
- **JSVerify** (JavaScript) - Property-based testing
- **Stryker** - Mutation testing
- **Vitest/Jest** - Test runners with coverage

## Real-World Examples

- **tRPC** - Tests that client types match server types
- **Prisma** - Tests generated client against database schema
- **OpenAPI** - Contract tests between spec and implementation
- **JSON Schema** - Validation tests for schema compliance

## Bottom Line

Contract testing doesn't prevent drift but makes it expensive. Best combined with type system enforcement (catch structural issues) and used to verify codegen correctness.
