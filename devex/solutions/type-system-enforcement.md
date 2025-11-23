# Solution: Type System Enforcement

## Overview

Use static typing to catch representation mismatches at compile time. Make illegal states unrepresentable and force explicit conversions between representations.

**Tier**: 2 (Makes Drift Expensive)

## Core Principle

If synchronization drift compiles, it will happen. Make the type system reject code that violates cross-representation invariants.

## When to Apply

- TypeScript/strongly-typed language
- Smaller schemas where codegen feels heavy-handed
- Frequent schema changes during development
- Team prefers explicit control over generation

## Implementation Techniques

### 1. Branded Types

Prevent accidental mixing of representations:

```typescript
// Brand each representation
type FormData = z.infer<typeof formSchema> & { __brand: 'FormData' };
type GameSetup = { /* ... */ __brand: 'GameSetup' };
type PromptString = string & { __brand: 'Prompt' };

// Force explicit conversions
function toGameSetup(form: FormData): GameSetup {
  return {
    title: form.scenarioTitle,
    // ... must map all fields explicitly
    __brand: 'GameSetup'
  } as GameSetup;
}

// This won't compile:
const setup: GameSetup = form; // Type error!
```

### 2. Exhaustive Type Checking

Use discriminated unions to force handling all cases:

```typescript
type SchemaField =
  | { type: 'string'; minLength: number }
  | { type: 'number'; min: number; max: number }
  | { type: 'array'; items: SchemaField };

function toPrompt(field: SchemaField): string {
  switch (field.type) {
    case 'string': return `text (min ${field.minLength})`;
    case 'number': return `number (${field.min}-${field.max})`;
    case 'array': return `list of ${toPrompt(field.items)}`;
    // If we add a new type, TypeScript will error here
  }
}
```

### 3. Mapped Types for Transformations

Encode transformation rules in the type system:

```typescript
// Define mapping at type level
type FormToSetup = {
  scenarioTitle: 'title';
  scenarioDescription: 'description';
  coreMetric: 'metric';
  stakeholders: 'actors';
};

type Transform<T, M> = {
  [K in keyof M as M[K] extends string ? M[K] : never]:
    K extends keyof T ? T[K] : never;
};

// Type error if mapping incomplete
type GameSetup = Transform<CustomScenarioForm, FormToSetup>;
```

### 4. Required Fields Verification

Ensure target schema can be constructed from source:

```typescript
type RequiredFields<T> = {
  [K in keyof T]-?: T[K];
};

type CanConvert<From, To> =
  RequiredFields<To> extends Partial<From>
    ? true
    : { error: 'Missing required fields'; missing: Exclude<keyof To, keyof From> };

// Compile error if conversion impossible
const _proof: CanConvert<CustomScenarioForm, GameSetup> = true;
```

### 5. Conversion Function Constraints

Use generics to enforce conversion signatures:

```typescript
type Converter<From, To> = (input: From) => To;

// All converters must satisfy this constraint
const formToSetup: Converter<CustomScenarioForm, GameSetup> = (form) => {
  return {
    title: form.scenarioTitle,
    // Type error if we miss required GameSetup fields
  };
};
```

## Integration Strategy

### Centralized Type Registry

```typescript
// types/registry.ts
export interface TypeRegistry {
  form: CustomScenarioForm;
  setup: GameSetup;
  prompt: PromptString;
  json: JsonSchema;
}

// All converters reference this registry
type Converter<From extends keyof TypeRegistry, To extends keyof TypeRegistry> =
  (input: TypeRegistry[From]) => TypeRegistry[To];
```

### Conversion Matrix

Document and type-check all conversions:

```typescript
interface ConversionMatrix {
  form: {
    setup: Converter<'form', 'setup'>;
    prompt: Converter<'form', 'prompt'>;
    json: Converter<'form', 'json'>;
  };
  setup: {
    form: Converter<'setup', 'form'>;
  };
}

// Type error if converter missing or has wrong signature
const conversions: ConversionMatrix = {
  form: {
    setup: toGameSetup,
    prompt: compileToPrompt,
    json: toJsonSchema,
  },
  setup: {
    form: fromGameSetup,
  },
};
```

### Builder Pattern with Type State

Track completeness at type level:

```typescript
class GameSetupBuilder {
  private data: Partial<GameSetup> = {};

  title(t: string): GameSetupBuilder { /* ... */ return this; }
  metric(m: string): GameSetupBuilder { /* ... */ return this; }

  // Can only call build() when all required fields set
  build(): GameSetup {
    if (/* all fields present */) {
      return this.data as GameSetup;
    }
    throw new Error('Incomplete');
  }
}
```

## Verification

### Compile-Time Checks

```bash
# CI pipeline
tsc --noEmit  # Fails if any type errors
```

### Runtime Boundaries

Add runtime validation at type boundaries:

```typescript
function toGameSetup(form: CustomScenarioForm): GameSetup {
  const setup = {
    title: form.scenarioTitle,
    // ...
  };

  // Paranoid check: ensure result satisfies schema
  const result = gameSetupSchema.parse(setup);
  return result;
}
```

## AI Collaboration

### Prompt Template

```
Add [field] to the CustomScenarioForm schema.

IMPORTANT: Update all conversion functions (toGameSetup, compileToPrompt, etc.).
The TypeScript compiler should show errors in these functions until updated.
Fix all type errors before marking complete.

Run `tsc --noEmit` to verify no type errors remain.
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

echo "Type checking..."
tsc --noEmit || {
  echo "Type errors detected. Fix before committing."
  exit 1
}
```

## Trade-offs

**Pros:**
- Immediate feedback at compile time
- No runtime overhead
- Explicit control over conversions
- Works with existing TypeScript tooling

**Cons:**
- Still requires manual implementation
- Type gymnastics can become complex
- Doesn't prevent logical errors (wrong mapping but right types)
- Requires TypeScript expertise

## Success Metrics

You've successfully implemented this solution when:

- Adding a schema field causes type errors in all converters
- Cannot pass wrong representation to a function
- `tsc --noEmit` catches synchronization drift
- AI-generated code fails to compile if incomplete

## Common Pitfalls

1. **Over-using `any` or type assertions** - Defeats the purpose
2. **Optional fields everywhere** - Allows incomplete conversions to compile
3. **Not running type checker in CI** - Drift reaches production
4. **Complex type gymnastics** - Team can't understand/maintain

## Related Solutions

- **Schema-Driven Codegen** - Generate types instead of writing manually
- **Contract Testing** - Verify runtime behavior matches types
- **Bidirectional Lenses** - Enforce round-trip type safety

## Real-World Examples

- **io-ts** - Runtime validation with static type derivation
- **Zod** - Schema validation with type inference
- **Effect** - Type-safe error handling with branded types
- **ts-pattern** - Exhaustive pattern matching

## Bottom Line

Type system enforcement makes drift expensive but doesn't eliminate it. Best combined with other solutions (codegen for generation, contract tests for verification).
