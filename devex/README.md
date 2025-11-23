# Developer Experience: Challenges & Solutions

A collection of common challenges in AI-assisted development and battle-tested solutions.

## Philosophy

AI agents excel at local optimization but require explicit guidance for maintaining global invariants. This guide helps you design architectures that make correctness mechanically enforced rather than manually maintained.

## Structure

- **`challenges/`** - Common problems in AI-assisted development with real-world examples
- **`solutions/`** - Concrete solutions with implementation strategies and trade-offs

## Quick Reference Matrix

| Challenge | Solution | Effectiveness | When to Use | Effort |
|-----------|----------|---------------|-------------|--------|
| [Local vs Global Coherence](challenges/local-vs-global-coherence.md) | [Schema-Driven Codegen](solutions/schema-driven-codegen.md) | ★★★★★ | >2 representations, frequent changes | High upfront, zero ongoing |
| [Local vs Global Coherence](challenges/local-vs-global-coherence.md) | [Type System Enforcement](solutions/type-system-enforcement.md) | ★★★★☆ | TypeScript codebase, prefer explicit control | Medium upfront, low ongoing |
| [Local vs Global Coherence](challenges/local-vs-global-coherence.md) | [Contract Testing](solutions/contract-testing.md) | ★★★☆☆ | Existing manual transformations, complex logic | Medium upfront, low ongoing |

## Effectiveness Legend

- ★★★★★ **Eliminates the Problem** - Makes drift impossible by construction
- ★★★★☆ **Makes Drift Expensive** - Compiler catches drift immediately
- ★★★☆☆ **Makes Drift Visible** - Tests catch drift before production
- ★★☆☆☆ **Makes Drift Detectable** - Runtime errors surface drift

## Challenges

### [Local vs Global Coherence](challenges/local-vs-global-coherence.md)

**Problem**: AI agents optimize for task completion rather than architectural coherence, creating technical debt through shortcuts and redundancy.

**Common Manifestations**:
- Multiple schema representations falling out of sync
- Duplicate validation logic with different rules
- Copy-paste drift across similar components
- Cascading updates required for single logical change

**Real Example**: See [schema-example.ts](challenges/schema-example.ts) for a production case of multi-schema synchronization.

**Recommended Solutions**:
1. **Primary**: [Schema-Driven Codegen](solutions/schema-driven-codegen.md) - Treat derived representations as build artifacts
2. **Alternative**: [Type System Enforcement](solutions/type-system-enforcement.md) - Use branded types and exhaustive checking
3. **Supplemental**: [Contract Testing](solutions/contract-testing.md) - Property-based tests for invariants

## Solutions by Tier

### Tier 1: Eliminates the Problem
Solutions that make the problem architecturally impossible.

- [Schema-Driven Codegen](solutions/schema-driven-codegen.md)

**Characteristics**: High upfront investment, zero ongoing maintenance, scales to any number of representations.

### Tier 2: Makes Drift Expensive
Solutions that catch problems at compile time.

- [Type System Enforcement](solutions/type-system-enforcement.md)
- [Contract Testing](solutions/contract-testing.md) (test time, not compile time)

**Characteristics**: Medium upfront investment, low ongoing maintenance, requires developer discipline.

### Tier 3: Makes Drift Visible
Solutions that catch problems at runtime or in CI.

- Contract Testing (when not blocking deployment)
- Runtime validation boundaries
- Integration test suites

**Characteristics**: Low upfront investment, medium ongoing maintenance, may reach production.

## How to Use This Guide

### For New Projects

1. Identify potential synchronization burdens (multiple representations, complex transformations)
2. Choose Tier 1 solution (codegen) if >2 representations exist
3. Add Tier 2 solutions (types, tests) for verification
4. Document decision in project README

### For Existing Projects

1. Identify where AI agents created local shortcuts
2. Assess current pain level (how often does drift occur?)
3. Start with Tier 3 solutions to make drift visible
4. Refactor to Tier 2 when pain justifies effort
5. Consider Tier 1 for highest-pain areas

### When Working with AI

1. **Before starting**: Tell AI which tier you're targeting
2. **During development**: Reference specific solution docs in prompts
3. **Before committing**: Verify AI followed solution patterns
4. **Post-session**: Review for local shortcuts

Example prompt:
```
Add [feature] to the system.

We use Schema-Driven Codegen (see devex/solutions/schema-driven-codegen.md).
After updating schemas, run `pnpm codegen` to regenerate derived code.
Do not manually update transformation functions.
```

## Contributing

When adding new challenges or solutions:

1. **Challenges** should:
   - Describe the problem pattern, not specific implementation
   - Include real code example (sanitized if needed)
   - List common manifestations
   - Reference applicable solutions

2. **Solutions** should:
   - Specify tier (1-3) and effectiveness
   - Include concrete implementation examples
   - List trade-offs honestly
   - Provide AI collaboration guidance
   - Reference related solutions

3. **Update this README** with:
   - New row in Quick Reference Matrix
   - Link in appropriate tier section
   - Update challenge's recommended solutions

## Related Resources

- [Git Co-Author Attribution](add-coauthor-to-git-history.md) - Preserve contribution credit when working with AI
- [Claude Code Documentation](https://docs.anthropic.com/claude-code) - Official Claude Code guide

## Key Takeaway

When working with AI over multiple sessions, invest upfront in **mechanically enforced coherence** (types, codegen, tests) rather than relying on AI to maintain mental models of cross-cutting relationships.

The problems in this guide are not failings of AI agents—they're predictable consequences of optimizing for task completion without architectural context. Design your systems accordingly.
