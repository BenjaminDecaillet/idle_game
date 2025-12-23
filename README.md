# Idle Silicon Valley

This is the project for an idle game `Idle Silicon Valley`. This game is designed based on the following core loop:

```(bash)
Buy workstation
→ Assign worker
→ Worker contributes work/sec to a project
→ Project completes
→ Money payout
→ Upgrade / hire / unlock
→ Repeat
```

> Projects must auto-repeat once unlocked. No tapping for core progress.
> No tapping for core progress.

The goal of this game is to have the best company and generate the most $.

## Table of Contents

- [Core game model](#core-game-model)

## Core game model

### Entities

- Company
- Project
- Worker
- Workstation

### Projects

*Example projects:*

- “Search Engine v2”
- “Social Feed Algorithm”
- “Cloud Auto-Scaling”
- “AI Recommendation Engine”

*Each project has:*

- Required work points (e.g. 10,000)
- Base reward
- Repeatable
- Scales exponentially

```(bash)
progress += total_worker_output * delta
if progress >= required:
    payout()
    reset progress
```

### Workers

Workers are the backbone of your company. Each worker has:

- Name (can be changed for a small fee)
- Skill level (affects work output) (Production rate = base rate * skill level = x Work/sec)
- Assigned workstation
- Salary (recurring cost)
- Specialization (e.g. Frontend, Backend, DevOps)
- Experience (increases skill level over time)

**Example worker types:**

```(bash)
Junior Dev → 1 work/sec
Senior Dev → 5 work/sec
Architect → 20 work/sec
```
