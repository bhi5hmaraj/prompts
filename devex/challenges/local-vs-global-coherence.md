# Local vs Global Coherence in AI-Assisted Development

## The Problem

When building complex systems with AI assistance over multiple sessions, agents tend to optimize for **local task completion** rather than **global architectural coherence**. This creates technical debt through shortcuts, redundancy, and synchronization burdens.

**Key characteristic**: AI agents will often create "quick fixes" that solve the immediate problem but increase maintenance complexity across the broader codebase.

## Concrete Example: Multi-Schema Synchronization

Consider a collaborative scenario builder where users work with AI to create structured data that's used downstream by another AI system. This requires maintaining consistency across multiple schema representations:

1. **Validation Schema** - Enforces data integrity (e.g., Zod schema)
2. **Form Schema** - UI representation with defaults and state management
3. **AI Prompt Schema** - Natural language compilation for downstream AI consumption
4. **Runtime Schema** - Internal format used by the application

### The Synchronization Burden

When one field changes (e.g., adding a new stakeholder property), all four schemas must be updated:
- Validation rules must match form constraints
- Form defaults must align with validation requirements
- Prompt compilation must include new fields
- Runtime conversion must handle the new property

**AI tendency**: When asked to "add a new field," the agent will modify the immediate schema without updating dependent representations, creating drift.

## Real-World Impact

See `schema-example.ts` for a production implementation demonstrating this pattern. The file exports:
- `zCustomScenarioForm` - Single source of truth (Zod schema)
- `compileToPrompt()` - Converts to natural language for AI
- `toGameSetup()` - Converts to runtime format
- `zodToCopilotParameters()` - Derives form parameters from schema
- `minimalCustomScenarioJsonSchema` - JSON Schema for validation

**Critical insight**: Even with a single source of truth, maintaining synchronization between derived representations requires discipline that AI agents don't naturally exhibit.

## Pattern Recognition

This problem manifests whenever:
- Multiple representations of the same logical entity exist
- Changes require cascading updates across representations
- AI is asked to make localized changes without full context
- Development happens iteratively over multiple sessions

Common domains:
- API contracts and client types
- Database schemas and ORM models
- Configuration schemas and runtime validators
- Form schemas and validation logic

## Prevention Strategies

### 1. Single Source of Truth with Codegen
- Define one canonical schema
- Generate all derived representations programmatically
- Never hand-edit generated code

**Example**: Derive JSON Schema, TypeScript types, and form defaults from one Zod schema.

### 2. Type System Enforcement
- Use static typing to catch mismatches at compile time
- Require explicit type conversions between representations
- Leverage branded types to prevent accidental mixing

### 3. Automated Testing
- Test synchronization explicitly (not just individual schemas)
- Assert that form defaults satisfy validation rules
- Verify round-trip conversions (schema → prompt → schema)

### 4. Constraint Propagation
- Build transformations that preserve constraints by construction
- Use helper functions that maintain invariants (e.g., `zodToCopilotParameters()`)

### 5. Prompt Engineering for Global Context
When requesting changes:
- ❌ "Add a maxRounds field to the form"
- ✅ "Add a maxRounds field. Update the Zod schema, form defaults, prompt compiler, and toGameSetup converter. Ensure validation constraints are consistent."

### 6. Session Continuity Practices
- Document schema relationships explicitly in code comments
- Maintain a "synchronization checklist" for schema changes
- Review AI-proposed changes for cross-cutting impact before committing

## Detection

Warning signs that synchronization drift has occurred:
- Runtime validation errors that should have been caught at compile time
- Form accepting values that backend rejects
- Downstream AI receiving incomplete or malformed data
- Tests passing individually but integration failing

## Recovery

When drift is detected:
1. Identify the canonical source of truth
2. Regenerate all derived schemas from the source
3. Add tests that verify synchronization
4. Add type guards at representation boundaries
5. Document the dependency chain for future changes

## Broader Implications

This pattern extends beyond schemas:
- **Component trees**: Props, state, and derived UI must stay synchronized
- **API versioning**: Client, server, and docs must evolve together
- **Build pipelines**: Source, intermediate, and output formats must align

**Core principle**: AI agents are excellent at local optimization but require explicit guidance for maintaining global invariants. Design your architecture to make synchronization failures visible and expensive (via types, tests, or runtime guards), forcing the AI to address them.

## Related Patterns

- **The God Object**: AI creates one mega-schema to avoid synchronization (creates different problems)
- **Copy-Paste Drift**: AI duplicates logic instead of centralizing (common when asked for quick fixes)
- **Validation Layers**: Multiple validation points with different rules (AI adds redundant checks)

## Key Takeaway

When working with AI over multiple sessions, invest upfront in **mechanically enforced coherence** (types, codegen, tests) rather than relying on AI to maintain mental models of cross-cutting relationships. The local vs global coherence problem is not a failing of AI agents—it's a predictable consequence of optimizing for task completion without architectural context.
