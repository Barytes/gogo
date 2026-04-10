# Repository AGENTS Guide

This repository contains the standalone Web MVP application for the research knowledge base.

## Scope

This root `AGENTS.md` applies to the web application and project-level architecture files in this repository.

The knowledge content, prompt files, and wiki pages live in a separate sibling repository pointed to by `KNOWLEDGE_BASE_DIR`.

For knowledge-base content rules, consult the external knowledge-base repo, especially:

- `AGENTS.md` inside that knowledge-base repository

## Architecture Sync Rule

Whenever a code change makes any part of `docs/mvp-architecture.md` inaccurate, update the affected part of `docs/mvp-architecture.md` in the same change.

This includes, when relevant:

- frontend structure
- backend routes
- API behavior
- page layout
- runtime or dependency setup
- data flow descriptions
- current system boundaries

Do not leave `docs/mvp-architecture.md` describing an older implementation after the code has changed.

## Documentation Principle

Keep `docs/mvp-architecture.md` aligned with the current implementation, not an outdated plan.

If the implementation and the document diverge, the change is not complete until the document is corrected.
