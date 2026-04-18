# Agent Instructions

You're working inside the **WATS framework** (Workflows, Agents, Tools,Skills). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

This repo combines two frameworks:
- **WAT**: Workflows, Agents, Tools for task automation
- **Skills**: Production-grade engineering skills for consistent code quality


---

## Architecture Overview

```
CEOdashboard/
├── tools/                   # Python scripts for automation
├── workflows/               # Markdown SOPs (WAT framework)
├── skills/                  # Agent Skills (symlinked to ~/.factory/agent-skills/skills)
├── spec.md                  # Full PRD (source of truth)
└── .tmp/                    # Temporary files (regenerated as needed)
```

---

## Skill-Driven Execution Model

This project uses **agent-skills** for engineering discipline. Skills are loaded from `skills/` (symlinked to `~/.factory/agent-skills/skills`).

### Core Rules

1. **Check for matching skill first** — Before any implementation, determine if a skill applies
2. **Invoke skill via `Skill` tool** — Use the skill tool with the skill name
3. **Follow skill exactly** — Don't partially apply; complete all steps
4. **Verify before moving on** — Each skill has exit criteria

### Intent → Skill Mapping

| User Intent | Skill(s) to Invoke |
|-------------|-------------------|
| New feature / functionality | `spec-driven-development` → `incremental-implementation` |
| Planning / task breakdown | `planning-and-task-breakdown` |
| Bug / failure / error | `debugging-and-error-recovery` |
| Code review | `code-review-and-quality` |
| Refactoring / simplification | `code-simplification` |
| API design | `api-and-interface-design` |
| Frontend / UI work | `frontend-ui-engineering` |
| Browser testing / debugging | `browser-testing-with-devtools` |
| Security concerns | `security-and-hardening` |
| Performance issues | `performance-optimization` |
| Git workflow | `git-workflow-and-versioning` |
| Deployment | `shipping-and-launch` |

### Lifecycle Mapping

For every request, follow this lifecycle:

```
DEFINE  →  spec-driven-development
PLAN    →  planning-and-task-breakdown
BUILD   →  incremental-implementation + test-driven-development
VERIFY  →  debugging-and-error-recovery
REVIEW  →  code-review-and-quality
SHIP    →  shipping-and-launch
```

### Anti-Rationalization

Ignore these incorrect thoughts:
- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior: **Always check for and use skills first.**

---

## WAT Framework (Workflows & Tools)

### How It Works

| Layer | Role |
|-------|------|
| **Workflows** | Markdown SOPs in `workflows/`: objective, inputs, steps, edge cases |
| **Agents** | AI orchestrator: reads workflow, calls tools, handles errors |
| **Tools** | Python scripts in `tools/`: API calls, data transforms, file ops |

### Workflow Naming Convention

- `scrape_*.md` — Web scraping workflows
- `export_*.md` — Data export workflows
- `report_*.md` — Report generation workflows
- `analyze_*.md` — Analysis workflows

### Creating New Tools

```python
#!/usr/bin/env python3
"""Tool: [name]"""
import os
import sys

def main():
    # Read inputs from environment or arguments
    # Do one focused task
    # Output result or write to .tmp/
    pass

if __name__ == "__main__":
    main()
```

---

## Available Skills

Skills are in `skills/` (22 total):

| Category | Skills |
|----------|--------|
| Define | `idea-refine`, `spec-driven-development` |
| Plan | `planning-and-task-breakdown` |
| Build | `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `frontend-ui-engineering`, `api-and-interface-design` |
| Verify | `browser-testing-with-devtools`, `debugging-and-error-recovery` |
| Review | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` |
| Ship | `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `shipping-and-launch` |

---

## Self-Improvement Loop

When a task fails or reveals a better approach:

1. **Identify** — What broke and why?
2. **Fix** — Update the tool or skill
3. **Verify** — Confirm the fix works
4. **Document** — Update the workflow with the new approach
5. **Resume** — Continue with a more robust system





