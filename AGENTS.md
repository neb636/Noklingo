# Engineering workflow

## UI roles and browser QA

- **Sol/Terra (parent/orchestrator)** owns requirement analysis, architecture inspection, planning, implementation, and code-level validation.
- For every meaningful UI feature or behavior change, the parent must delegate independent exploratory browser verification to the **Luna browser QA subagent** before considering the work complete.
- Luna must load and follow the project-local `browser-qa` skill (`.agents/skills/browser-qa/SKILL.md`). Luna reports findings to the parent and must not make broad application or architecture changes unless explicitly asked.
- UI work is complete only after the browser QA report is returned and any relevant findings are addressed or documented.

## Type safety and tests

- Run the strict project typecheck (`npm run typecheck`) for every code change. Do not introduce new TypeScript errors, unsafe casts, or `@ts-ignore`/`@ts-expect-error` suppressions merely to satisfy the checker.
- Write focused unit tests for deterministic input-to-output logic such as utilities, parsers, formatters, recommendation/scoring functions, validators, and important or frequently changed regular expressions.
- Cover meaningful normal, boundary, and invalid-input cases in those tests.
- Do **not** add generic component, snapshot, or implementation-detail tests merely for coverage. Use browser QA for UI behavior; add broader automation only for important business behavior or a concrete regression it protects.

## React practices

- Build small, cohesive components with explicit, well-typed props and clear ownership of state.
- Keep state minimal: derive during render where possible rather than mirroring data in state or synchronizing it with effects.
- Use effects only to synchronize with external systems, with correct dependencies and cleanup.
- Deliberately handle loading, empty, error, and disabled states where applicable.
- Preserve accessibility with semantic HTML, associated labels, keyboard-operable controls, visible focus, and meaningful status/error messages.
- Use stable domain keys for mutable lists; avoid premature memoization and unnecessary abstractions.
