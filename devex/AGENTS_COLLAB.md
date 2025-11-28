# AGENTS.md — Guidelines for AI Coding Agents & Assistants

This document defines how AI agents (and AI code assistants) are expected to work in this repository.

It’s written for:
- Humans using AI tools (chat, IDE plugins, agents), and
- Agents that are given direct access to this repo.

The goal: **move faster** *without* turning the codebase into spaghetti.

---

## 0. Core Principles

1. **Humans are responsible.**
   - All code must remain understandable and reviewable by humans.
   - Never commit AI-generated code you don’t personally understand and trust.   

2. **Prefer maintainability over clever hacks.**
   - Boring, idiomatic code beats “look how smart I am” code.
   - Follow existing patterns and conventions; don’t introduce new ones casually.   

3. **Architecture > local convenience.**
   - Honor existing layers and boundaries (domain vs UI vs infra, etc.).
   - Don’t “just make it work” by reaching across layers or duplicating concepts.

4. **One source of truth per concept.**
   - If a concept already exists (e.g., `User`, `Order`, `GameState`), reuse its schema/type.
   - New shapes must have clear names (`UserDto`, `UserForm`, `UserView`) and explicit converters.

5. **Tests and validation are non-optional.**
   - AI-generated changes must keep tests passing.
   - For non-trivial logic, add or update tests in the same change.   

---

## 1. Scope: What Agents *Should* and *Should Not* Do

### 1.1 Safe / Encouraged Tasks

Agents are **welcome** to:

- Refactor code *within* a module or layer to improve clarity, duplication, or performance.
- Add or update tests for existing functionality.
- Generate documentation (README, comments, ADRs) based on the code.
- Suggest or implement small, localized fixes (typos, small bugs, simple performance tweaks).
- Apply mechanical changes across the repo (renames, formatting, trivial migrations), **if** they preserve behavior.

These tasks align with best practices for AI coding assistants: targeted changes, clear prompts, and human review.   

### 1.2 High-Risk Tasks (Require Extra Care)

Agents may perform these **only with an explicit plan + human review**:

- Changing public APIs or contract types.
- Modifying domain models / schemas used across many modules.
- Altering security-related logic, authz/authn, permissions, or cryptography.
- Changing database schemas or migrations.
- Rewriting orchestration flows (job schedulers, workflows, complex pipelines).

For these, agents must:
1. Produce an **impact analysis** (files, modules, and systems affected).
2. Propose a **stepwise plan**.
3. Only then generate code.

### 1.3 Forbidden Tasks

Agents must **not**:

- Introduce secrets or tokens into code or config.
- Disable security, validation, error handling, or tests just to “get things passing”.
- Bypass architecture rules (e.g., UI importing DB directly) even if the change “works”.
- Delete or neuter tests without an explicit, documented rationale.

---

## 2. Architecture & Boundaries

> If you don’t know the architecture, ask for it (or read `ARCHITECTURE.md` / `ARCH_RULES.md`) before editing.

### 2.1 Respect Layers

Typical layers might include:

- `domain/` – core business logic and domain types
- `app/`, `ui/` – user interfaces, presentation logic
- `infra/`, `server/` – DB, queues, external services, framework glue
- `agents/` – long-running tools, workflows, LLM integration

Agents must **not** introduce new cross-layer dependencies that violate established rules:

- UI should not import DB or low-level infra directly.
- Domain code should not depend on UI or framework-specific modules.
- Infra should not reach into UI.

To enforce this, we may use tools like **dependency-cruiser** or eslint rules that define allowed imports. Agents should respect and not attempt to “work around” these tools.   

### 2.2 Naming Conventions for Models

To avoid schema drift:

- **Bare names** (`User`, `GameState`, `Order`) are reserved for **domain models**.
- Other layers must use meaningful suffixes:
  - `UserDto`, `UserDb`, `UserRow`, `UserRecord`
  - `UserForm`, `UserView`, `UserVm`
  - `UserMpSchema`, `UserWire`, etc.

If an agent thinks a new representation is needed, it must:
1. Reuse existing domain type if possible.
2. Otherwise, create a clearly suffixed type and a converter function:
   - `userFromDb(row: UserDb): User`
   - `userToDb(user: User): UserDb`

---

## 3. Schemas, Types & Validation

Many projects use a schema library (e.g., Zod, Effect Schema, Yup, JSON Schema, etc.) as the **single source of truth** for data shapes. For example, Zod is a TypeScript-first schema validation library that both validates at runtime and infers static TS types from a single schema.   

### 3.1 If This Repo Uses a Schema Library

Agents must:

1. **Derive TS types from schemas**, not hand-write parallel interfaces:
   - ✅ `type User = z.infer<typeof UserSchema>;`
   - ❌ `interface User { ... }` duplicating the schema fields.

2. **Never bypass validation**:
   - Don’t cast to `any` / `unknown` to silence type or validation errors.
   - Use `schema.parse()` / `safeParse()` or equivalent at boundaries (API, DB, LLM, config).

3. **Keep derived artifacts in sync**:
   When a schema changes (e.g., `UserSchema`), update:
   - API request/response types
   - DB mappings
   - LLM tool / JSON schemas that mirror that shape
   - Form validation rules and UI models
   - Tests for conversions

4. **Add or update conversion tests**:
   - Example: round-trip tests for DTO ↔ domain ↔ DB models.

### 3.2 When Adding Fields to a Core Model

Any change to a core model (e.g., `User`, `GameSetup`, `GameState`) should:

1. Update the canonical schema.
2. Update all related representations (DTOs, forms, views, DB records).
3. Update serializers/deserializers and mappers (e.g., `toDomain`, `toDb`, `toForm`).
4. Update or add tests that cover:
   - Creation
   - Serialization
   - Validation

Agents should explicitly **list** which of these they touched in their response.

---

## 4. Working With AI: Process & Prompt Patterns

### 4.1 For Humans Using Agents

When you ask an agent to change code:

1. **Provide context**:
   - What you’re trying to achieve.
   - Relevant files, architecture notes, and constraints.   

2. **Ask for a plan first** for anything non-trivial:
   - “First, list all files/layers affected by adding `maxRounds` to `GameSetup`.”
   - “Then, propose a step-by-step plan.”
   - “Only after that, show me the patch.”

3. **Review like a PR from a junior dev**:
   - Look for:
     - new `any`/`unknown` casts,
     - new types duplicating existing ones,
     - cross-layer imports that violate architecture,
     - removed or neutered tests.

4. **Keep yourself in the loop**:
   - Think of the AI as the “driver” and you as the “navigator” reviewing and steering.   

### 4.2 For Agents Acting Autonomously

Agents that operate via tools or CI should:

1. **Read the relevant docs first**:
   - `ARCHITECTURE.md`, `ARCH_RULES.md`, this `AGENTS.md`, and any per-service README.

2. **Produce an Impact Analysis section**:
   - List:
     - affected modules,
     - models/schemas touched,
     - tests affected.

3. **Explain breaking changes**:
   - Any change to public API, DB schema, or domain models must be called out, with rationale.

4. **Update tests and docs** in the same change where practical.

5. **Never commit directly to main**:
   - Always work via branches/PRs (or equivalent) so humans can review.

---

## 5. Testing & Quality

Agents should assume:

- **Tests are authoritative**: if tests and code disagree, fix the code or improve the tests, but never just delete tests to make CI green.
- **Add tests when behavior changes**:
  - New feature → new tests.
  - Changed behavior → updated tests.
  - Refactor → keep tests logically the same, but improve where necessary.

Several external guides on AI-assisted development emphasize continuous testing and human verification as essential to safe, maintainable AI-generated code.   

---

## 6. Security, Privacy & Compliance

Agents must:

- Treat all secrets (tokens, keys, passwords, private URLs, datasets) as **sensitive**.
- Never:
  - log secrets,
  - hard-code credentials,
  - commit `.env` or secret config files.
- Respect project-specific security policies if they exist (`SECURITY.md`, `PRIVACY.md`, etc.).
- Not relax security checks (authz/authn, input validation, rate limiting) to “make tests pass”.

If a change **might** impact security (auth flows, cryptography, data access), agents must:
1. Call that out explicitly.
2. Ask for human review/approval.

---

## 7. Anti-Patterns Checklist

If an agent’s suggestion includes any of these, treat it as a red flag:

- [ ] Introduces `any` or `unknown` casts just to satisfy the compiler.
- [ ] Adds a new `interface`/`type` which duplicates an existing domain concept.
- [ ] Imports from a layer it previously didn’t depend on (UI → DB, domain → UI, etc.).
- [ ] Deletes or comments out tests without explanation.
- [ ] Bypasses validation or error handling.
- [ ] Disables linting/rules/tools instead of fixing the underlying issue.
- [ ] Hard-codes secrets or environment-specific values.
- [ ] Changes core schemas without updating converters and tests.

If any box is checked, ask the agent to **rework** the solution in line with the principles above.

---

## 8. Final Reminder

AI agents are **accelerators**, not owners.

The rules above are designed to:

- Let agents handle the boring, repetitive, or mechanical parts.
- Keep humans in charge of architecture, semantics, and trade-offs.
- Avoid the “it works now, but we can’t change anything later” trap.

If you find yourself regularly fighting the agents or these guidelines, open an issue and propose an update to `AGENTS.md`. This document is meant to evolve with the codebase—and with how we use AI.
