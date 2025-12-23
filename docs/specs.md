# Specifications

This document outlines the core specifications and structure of the game model. for `Idle Silicon Valley`.

# Table of Contents

- [Core Game Model](#core-game-model)
  - [Project strructure](#project-structure)
  - [Scenes](#scenes)
  - [Scripts](#scripts)
  - [ui](#ui)
  - [assets](#assets)

## Core Game Model

Contains the main components and their relationships within the game, as well as the description of the file contents and structures.

### Project structure

```(bash)
res://
│
├── scenes/
│   ├── main.tscn
│   ├── company/
│   │   ├── company_view.tscn
│   │   ├── project_card.tscn
│   │   └── worker_card.tscn
│
├── scripts/
│   ├── game_manager.gd
│   ├── company.gd
│   ├── project.gd
│   ├── worker.gd
│   └── save_manager.gd
│
├── ui/
│   ├── hud.tscn
│   └── dialogs/
│
├── data/
│   ├── projects.json
│   └── workers.json
│
└── assets/
    └── icons/
```

