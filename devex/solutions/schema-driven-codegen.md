# Solution: Schema-Driven Code Generation

## Overview

Treat derived representations as build artifacts rather than source code. When multiple representations of the same logical entity exist, generate them programmatically from a single annotated schema instead of maintaining them manually.

**Tier**: 1 (Eliminates the Problem)

## Core Principle

Just like you wouldn't manually write `.js` files when you have `.ts` sources, don't manually write transformation functions when you have a schema.

## When to Apply

- Schema has >2 representations (types, forms, APIs, docs, etc.)
- Frequent schema changes expected
- Multiple developers/AI sessions working on the codebase
- Synchronization errors have occurred previously

## Implementation Approaches

### 1. Metadata-Driven Generation

Annotate your source schema with transformation metadata:

```typescript
const schema = z.object({
  scenarioTitle: z.string()
    .min(3)
    .meta({
      prompt: 'Scenario: {value}',
      formLabel: 'Scenario Title',
      jsonPath: 'title',
      aiDescription: 'The main title of the scenario'
    }),
});
```

Build script extracts metadata and generates:
- TypeScript types
- Form defaults
- Prompt templates
- JSON Schema
- API documentation

### 2. Existing Tool Ecosystem

Leverage battle-tested codegen tools:

- **zod-to-json-schema** - Generate JSON Schema from Zod
- **zod-to-ts** - Generate TypeScript types
- **quicktype** - Generate types from JSON Schema (multi-language)
- **openapi-generator** - Generate clients from OpenAPI specs
- **GraphQL Code Generator** - Generate types from GraphQL schemas

### 3. Custom Codegen with Template Engine

For domain-specific transformations:

```typescript
// scripts/generate-forms.ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import Handlebars from 'handlebars';

const template = Handlebars.compile(fs.readFileSync('templates/form.hbs', 'utf-8'));

for (const [name, schema] of Object.entries(schemas)) {
  const jsonSchema = zodToJsonSchema(schema);
  const output = template({ name, schema: jsonSchema });
  fs.writeFileSync(`generated/${name}Form.tsx`, output);
}
```

## Integration Strategy

### Build Pipeline

Add codegen as a build step:

```json
// package.json
{
  "scripts": {
    "codegen": "tsx scripts/generate.ts",
    "prebuild": "pnpm codegen",
    "dev": "pnpm codegen && next dev"
  }
}
```

### Git Workflow

**Option A**: Commit generated code
- Pro: Visible diffs in PRs
- Con: Larger repo size
- Best for: Small generated code, team wants visibility

**Option B**: Ignore generated code
- Pro: Cleaner git history
- Con: CI must run codegen
- Best for: Large generated code, team trusts codegen

### Pre-commit Hooks

Force regeneration on schema changes:

```bash
#!/bin/bash
# .husky/pre-commit

# Detect schema changes
if git diff --cached --name-only | grep -q "schemas/"; then
  echo "Schema changed - regenerating derived code"
  pnpm codegen
  git add generated/
fi
```

## Verification

### Type-Level Checks

Ensure generated code is type-safe:

```typescript
// verify-codegen.ts
import type { CustomScenarioForm } from './schemas/form';
import type { GameSetup } from './generated/types';

// Compile error if conversion impossible
type CanConvert<From, To> =
  Required<To> extends Partial<From> ? true : never;

const _proof: CanConvert<CustomScenarioForm, GameSetup> = true;
```

### Runtime Validation

Test generated transformations:

```typescript
import { test } from 'vitest';
import fc from 'fast-check';

test('generated converter maintains invariants', () => {
  fc.assert(
    fc.property(arbitraryForm, (form) => {
      const setup = generatedConverter(form);
      expect(setupSchema.safeParse(setup).success).toBe(true);
    })
  );
});
```

## Maintenance

### Schema Change Workflow

1. Update source schema (e.g., `schemas/form.ts`)
2. Run `pnpm codegen`
3. Type errors appear in consuming code if breaking change
4. Fix consumers, commit source + generated code together

### AI Collaboration

**Prompt template for schema changes:**

```
Update the [schema name] schema to add [field description].

IMPORTANT: After modifying the schema, run `pnpm codegen` to regenerate
all derived code. Do not manually update transformation functions.

Verify:
1. No TypeScript errors after codegen
2. All tests pass
3. Generated files are staged for commit
```

## Trade-offs

**Pros:**
- Zero synchronization drift by construction
- One command regenerates everything
- Type safety across all representations
- Scales to arbitrary number of representations

**Cons:**
- Requires upfront tooling investment
- Generated code may be harder to debug
- Team must understand codegen pipeline
- Custom transformations need template maintenance

## Success Metrics

You've successfully implemented this solution when:

- Schema changes trigger automatic regeneration
- No manual transformation functions exist
- Type errors catch representation mismatches at compile time
- New team members can add fields without understanding all representations

## Related Solutions

- **Bidirectional Lenses** - For complex bidirectional transformations
- **Contract Testing** - Verify generated code maintains invariants
- **Static Verification** - Prove correctness at type level

## Real-World Examples

- **tRPC** - Generates type-safe client from server schema
- **Prisma** - Generates client from database schema
- **GraphQL Codegen** - Generates types from GraphQL schema
- **OpenAPI Generator** - Generates clients/servers from OpenAPI specs

## Bottom Line

The moment you have >2 representations of the same logical entity, invest in codegen. Otherwise you're fighting entropy manually, which AI agents will accelerate.
