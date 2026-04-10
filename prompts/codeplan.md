# Codeplan Strategy

## Overview

Every non-trivial bundle is built layer by layer. A layer is a self-contained
unit of code with a clearly bounded responsibility. No layer's code is written
until the layer below it has passing tests. No layer's tests are written against
stubs or placeholders — they test the real implementation.

---

## Phase 0 — Design Before Code

Before any file is created, the full system is mapped in pseudocode or prose:

- What are the data shapes?
- What are the dependencies between modules?
- What events fire, who emits them, who listens?
- Where are the integration seams with other bundles?
- What decisions carry real risk if made incorrectly?

This phase produces a **layer stack**: an ordered list of modules with explicit
dependency arrows between them. If you can't draw the dependency graph, you're
not ready to write code.

High-risk architectural decisions (storage format, atomicity contracts,
bundle boundaries) are worked out here — in writing — before they calcify in
code.

---

## Phase 1 — Layer Stack Definition

The layer stack is defined bottom-up, starting from pure data and moving toward
wired behavior. A typical bundle looks like:

```
Layer 1  — Data definitions / JSON schemas (no logic, no imports)
Layer 2  — Core domain logic (depends only on Layer 1)
Layer 3  — Secondary logic (depends on Layer 2)
Layer 4  — Aggregators / orchestrators (depend on Layers 2–3)
Layer 5  — I/O and side-effects (persistence, spawning, intervals)
Layer 6  — Commands (depend on all lib layers + state)
Layer 7  — server-events wiring (the last thing to write)
```

Each layer entry in the plan specifies:

- **Responsibility** — one sentence describing what it does and nothing else
- **API** — the exported function signatures or class interface
- **Assumes** — which lower-layer contracts it depends on
- **Confirms** — the test cases that must pass before the next layer starts

---

## Phase 2 — Build and Confirm, One Layer at a Time

### The rule

Write a layer. Write its tests. Run them. All tests pass. Only then start the
next layer.

This is a hard stop, not a suggestion. Starting the next layer before confirming
the current one means bugs propagate upward and become invisible — they hide
behind the complexity of the layers above them.

### One file at a time

Within a layer, changes are made one file at a time. Patches are surgical.

### Test files

Each layer gets its own test file, named by layer number:

```
bundles/my-bundle/tests/layer1.test.js
bundles/my-bundle/tests/layer2.test.js
```

Tests use Node's built-in `node:test` runner. No external test frameworks.
Tests are diagnostic by design — they validate specific assumptions, not just
final outputs. A test that passes for the wrong reason is worse than no test.

### Explicit stopping points

After each layer's tests pass, there is an explicit stop:

> "Layer N complete. Tests passing. Confirm before proceeding to Layer N+1."

This preserves the ability to course-correct before investment compounds.

When you complete a layer, make sure to reference the generated code via an HTML clickable artifact so the user can manually review generated the code.

---

## Phase 3 — Diagnostic-Driven Debugging

When a test fails, the process is:

1. Identify the specific assumption being violated — not the symptom, the root.
2. Write targeted diagnostic code that isolates the assumption.
3. Fix the root cause.
4. Re-run tests.

Do not guess. Do not make multiple changes at once. Do not re-derive from
scratch what is already confirmed — trust passing tests and build on them.

---

## Principles

### Dependency order is the build order

The layer that has no dependencies gets built first. Always. Skipping ahead
because a lower layer seems simple is how you end up retrofitting everything
above it.

### Separation of concerns is non-negotiable

Rendering logic does not live in domain logic. Display concerns do not bleed
into storage concerns. Bundle A does not directly call into bundle B's internals
— it uses the registered service on `state` or listens to an event. If a clean
seam doesn't exist yet, design it before writing code that crosses it.

### Reusable abstractions over inline logic

If a pattern appears more than once, it becomes a utility. Shared utilities live
in `bundle-lib`. Inline logic that should be a utility is a deferred debt that
compounds.

### Design contracts are documented in the code

Non-obvious contracts (atomicity guarantees, invariants that must be preserved
across two modules, sync requirements between files) get a comment at the
relevant site — not in a separate doc that will drift.

---

## What This Looks Like In Practice

A session follows this shape:

1. Review the current layer plan together.
2. Confirm the layer's API and test cases before writing implementation.
3. Implement the layer — one file at a time.
4. Write and run the tests.
5. Review results. Fix issues diagnostically.
6. Hard stop. Confirm passing tests explicitly.
7. Move to the next layer.

If a design decision surfaces mid-layer that affects the layer above it, work
stops and the design is resolved before implementation continues. Code does not
outrun the design.