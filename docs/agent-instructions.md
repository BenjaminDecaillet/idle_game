# Agent Instructions for Idle Silicon Valley Development

This document provides step-by-step instructions for working with an AI agent during the development of the Idle Silicon Valley game using Godot.

## Project Overview

**Game:** Idle Silicon Valley  
**Engine:** Godot  
**Type:** Idle/Incremental Game  
**Core Loop:** Buy workstation → Assign worker → Generate work/sec → Complete projects → Earn money → Upgrade/unlock → Repeat

### Key Principles

- **No tapping for core progress** - Projects auto-repeat once unlocked
- **Exponential scaling** - Projects and costs scale as the game progresses
- **Idle-friendly** - Progress continues even when not actively playing

---

## Development Phases

### Phase 1: Project Setup & Core Data Structures

**Objective:** Set up the project structure and create the fundamental data models.

#### Instructions for Agent

1. **Verify Godot project structure exists**
   - Ensure `project.godot` is properly configured
   - Verify folder structure matches specs: `scenes/`, `scripts/`, `ui/`, `data/`, `assets/`

2. **Create core GDScript classes**
   - `scripts/game_manager.gd` - Main game controller (singleton/autoload)
   - `scripts/company.gd` - Company state management
   - `scripts/project.gd` - Project data and logic
   - `scripts/worker.gd` - Worker data and behavior
   - `scripts/workstation.gd` - Workstation management

3. **Key requirements for each script:**

   **game_manager.gd:**

   ```(bash)
   - Singleton/AutoLoad
   - Manages game state and delta time
   - Handles save/load operations
   - Tracks global currency
   ```

   **company.gd:**

   ```(bash)
   - Array of workers
   - Array of workstations
   - Current project assignment
   - Total money/currency
   - Methods: hire_worker(), buy_workstation(), assign_worker()
   ```

   **project.gd:**

   ```(bash)
   - Properties: name, required_work, base_reward, current_progress
   - Exponential scaling logic
   - Methods: add_progress(), complete(), reset()
   ```

   **worker.gd:**

   ```(bash)
   - Properties: name, skill_level, salary, specialization, experience
   - Production rate calculation: base_rate * skill_level
   - Types: Junior Dev (1 work/sec), Senior Dev (5 work/sec), Architect (20 work/sec)
   ```

4. **Create JSON data files**
   - `data/projects.json` - Project templates with name, required work, and rewards
   - `data/workers.json` - Worker type definitions

---

### Phase 2: Game Logic Implementation

**Objective:** Implement the core game loop mechanics.

#### Instructions for Agent

1. **Implement work generation system**
   - Calculate total worker output per second
   - Update project progress based on `_process(delta)`
   - Handle project completion and auto-restart

2. **Implement progression mechanics**
   - Project completion triggers payout
   - Currency updates
   - Exponential scaling for repeated projects
   - Experience gain for workers over time

3. **Implement economic system**
   - Worker salaries (recurring cost)
   - Workstation purchase costs
   - Upgrade costs
   - Balance initial values for good game feel

4. **Add save/load functionality**
   - Create `scripts/save_manager.gd`
   - Save: workers, workstations, projects, currency, progress
   - Auto-save at regular intervals
   - Load on game start

**Testing checklist:**

- [ ] Workers generate work/sec correctly
- [ ] Projects complete when progress >= required_work
- [ ] Money is awarded on completion
- [ ] Projects auto-restart
- [ ] Save/load preserves all game state

---

### Phase 3: UI Development

**Objective:** Create the user interface for all game interactions.

#### Instructions for Agent

1. **Create main scene structure**
   - `scenes/main.tscn` - Root scene with HUD and view containers
   - `ui/hud.tscn` - Displays money, current project progress

2. **Create company view components**
   - `scenes/company/company_view.tscn` - Main company overview
   - `scenes/company/project_card.tscn` - Display single project with progress bar
   - `scenes/company/worker_card.tscn` - Display worker stats and assignment

3. **UI Requirements:**
   - Display current money at all times
   - Show active project with progress bar
   - List all workers with their stats and assignments
   - List available workstations
   - Buttons for: hire worker, buy workstation, assign worker
   - Real-time updates (no manual refresh needed)

4. **Create dialog scenes**
   - Worker hiring dialog
   - Worker assignment dialog
   - Workstation purchase confirmation
   - Settings/options menu

5. **Connect UI to game logic**
   - Update displays in `_process()` or via signals
   - Wire button presses to GameManager methods
   - Show visual feedback for player actions

**Testing checklist:**

- [ ] Money counter updates in real-time
- [ ] Progress bar animates smoothly
- [ ] All buttons are functional
- [ ] UI updates when workers are assigned/hired
- [ ] Visual feedback on actions (purchases, assignments)

---

### Phase 4: Game Balance & Content

**Objective:** Populate the game with content and balance the progression.

#### Instructions for Agent

1. **Add project variety**
   - Create 10-15 different project types
   - Example names: "Search Engine v2", "Social Feed Algorithm", "Cloud Auto-Scaling", "AI Recommendation Engine"
   - Balance required_work and rewards
   - Scale difficulty appropriately

2. **Add worker variety**
   - Different specializations: Frontend, Backend, DevOps, Data Science
   - Tier structure: Junior → Mid → Senior → Architect → Principal
   - Balanced skill levels and salary costs

3. **Implement upgrade system**
   - Worker skill upgrades
   - Workstation efficiency boosts
   - Unlock new project types
   - Research/technology tree (optional)

4. **Balance currency flow**
   - Early game should feel rewarding
   - Mid game should require strategic choices
   - Late game should have prestige/reset mechanic potential
   - Test and adjust all values

**Testing checklist:**

- [ ] Early game (first 5 minutes) is engaging
- [ ] Progression feels smooth, not grindy
- [ ] Player has meaningful choices
- [ ] No dominant strategy (multiple paths viable)

---

### Phase 5: Polish & Enhancement

**Objective:** Add polish, visual feedback, and quality-of-life features.

#### Instructions for Agent

1. **Visual enhancements**
   - Add icons for workers, projects, workstations (in `assets/icons/`)
   - Particle effects for project completion
   - Smooth transitions and animations
   - Themed UI colors (tech/startup aesthetic)

2. **Audio (if applicable)**
   - Background music
   - Sound effects for actions
   - Completion fanfare

3. **Quality of life features**
   - Tooltips on hover
   - Hotkeys for common actions
   - Batch operations (hire multiple workers)
   - Statistics screen (total money earned, projects completed, etc.)
   - Offline progress calculation

4. **Settings & accessibility**
   - Volume controls
   - Speed controls (1x, 2x, 5x game speed)
   - Save slot management
   - Reset/new game option

**Testing checklist:**

- [ ] Game feels polished and responsive
- [ ] All tooltips are clear and helpful
- [ ] Offline progress works correctly
- [ ] Settings persist across sessions

---

## Working with the Agent: Best Practices

### 1. **Provide Clear Context**

Always reference:

- Which phase you're working on
- The specific component or file
- The desired outcome or behavior

**Example:**
> "We're in Phase 2. Please implement the work generation system in game_manager.gd. Workers should contribute their work_per_sec multiplied by delta time to the active project's progress."

### 2. **Request Incremental Changes**

Don't ask for entire phases at once. Break down tasks:

**Good:**
> "Create the worker.gd script with properties for name, skill_level, salary, and specialization. Include a method to calculate work_per_sec."

**Too broad:**
> "Build the entire game."

### 3. **Specify Godot Version & GDScript Syntax**

Mention if you're using Godot 3.x or 4.x, as syntax differs.

**Example:**
> "Using Godot 4.x, create a signal in project.gd that emits when a project completes."

### 4. **Request Testing & Validation**

After implementations, ask the agent to:

- Explain how to test the feature
- Identify potential edge cases
- Verify integration with existing code

**Example:**
> "After implementing save_manager.gd, explain how to test that game state properly persists between sessions."

### 5. **Iterate on Balance**

For game balance, provide feedback on playtesting:

**Example:**
> "The early game feels too slow. Can you adjust the starting worker's work_per_sec from 1 to 2, and reduce the first project's required_work from 100 to 50?"

### 6. **Reference the Specs**

Always ensure implementations align with specs.md and README.md:

**Example:**
> "Following the core loop in README.md, ensure projects auto-restart after completion without player input."

---

## Common Agent Prompts by Phase

### Phase 1 Example Prompts

```
"Create game_manager.gd as an AutoLoad singleton with methods to update game state each frame."

"Implement worker.gd with the three worker types from README: Junior Dev (1 work/sec), Senior Dev (5 work/sec), Architect (20 work/sec)."

"Create projects.json with 5 example projects following the format: name, required_work, base_reward."
```

### Phase 2 Example Prompts

```
"In game_manager.gd, implement the _process(delta) function to accumulate worker output into the current project's progress."

"Add exponential scaling to project.gd so that each completion increases required_work by 15% and reward by 10%."

"Create save_manager.gd with save_game() and load_game() functions that serialize all game state to JSON."
```

### Phase 3 Example Prompts

```
"Create worker_card.tscn with labels for name, skill level, and a button to assign to workstation."

"In company_view.tscn, add a progress bar that updates every frame showing current_progress / required_work."

"Wire the 'Hire Worker' button to call GameManager.hire_worker() and update the worker list UI."
```

### Phase 4 Example Prompts

```
"Populate projects.json with 10 diverse project names fitting the Silicon Valley startup theme."

"Add a specialization matching system where workers get a 1.5x bonus if their specialization matches the project type."

"Create an upgrade system where players can spend money to increase a worker's skill_level by 1 for cost = skill_level * 100."
```

### Phase 5 Example Prompts

```
"Add a tooltip system that shows detailed stats when hovering over a worker card."

"Implement offline progress: calculate elapsed time since last session and fast-forward game state."

"Add a particle effect that plays when a project completes, positioned above the project card."
```

---

## Troubleshooting Guide

### Issue: Progress not accumulating

**Agent prompt:**
> "Debug the work accumulation in game_manager.gd. Verify that total_worker_output is calculated correctly and multiplied by delta time."

### Issue: Projects not auto-restarting

**Agent prompt:**
> "In project.gd, check the complete() method. Ensure it resets progress to 0 and doesn't disable the project."

### Issue: Save/load not working

**Agent prompt:**
> "Review save_manager.gd. Confirm that all game state objects are properly serialized and deserialized. Add debug prints to verify file I/O."

### Issue: UI not updating

**Agent prompt:**
> "Check that HUD updates are called in _process() or connected to signals from GameManager. Ensure all labels have the correct NodePath references."

---

## Final Delivery Checklist

Before considering the game complete, verify with the agent:

- [ ] All core loop elements function: buy → assign → work → complete → payout → upgrade
- [ ] Projects auto-repeat without player input
- [ ] No core progress requires tapping/clicking
- [ ] Save/load preserves all game state
- [ ] UI is responsive and updates in real-time
- [ ] Game balance feels appropriate for idle game pacing
- [ ] No critical bugs or crashes
- [ ] Code follows Godot best practices and is well-commented

---

## Additional Resources

- **Godot Documentation:** <https://docs.godotengine.org/>
- **GDScript Style Guide:** Follow Godot's official style guide for consistency
- **Idle Game Design Principles:** Research incremental/idle game balance and progression curves

---

## Version History

- v1.0 - Initial agent instruction document (December 23, 2025)
