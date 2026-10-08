# Game Engine Editor and Project Architecture

## 1. Purpose

The editor should operate as a visual authoring environment for game projects.

Its main responsibilities are:

- opening game projects
- editing level JSON files directly
- browsing project assets
- importing assets into the project
- editing level content and entity data
- running or simulating the project inside the editor
- saving changes back to project files

The editor is not intended to replace a normal IDE.

Gameplay code, ECS systems, ECS components, runtime code, and other implementation details remain developer-owned source code and should normally be edited using tools such as VS Code or IntelliJ.

The editor and IDE therefore operate on the same game project but serve different purposes.

---

## 2. Project-Based Workflow

The editor should work with complete game projects rather than isolated level files.

The user opens a game project by selecting its root folder.

Example:

```text
my-game/
├── game.project.json
│
├── src/
│   ├── components/
│   ├── systems/
│   ├── gameplay/
│   ├── runtime/
│   └── main.ts
│
├── assets/
│   ├── levels/
│   │   ├── main.json
│   │   └── dungeon.json
│   │
│   ├── sprites/
│   │   ├── player.png
│   │   └── enemy.png
│   │
│   └── audio/
│
├── editor-runtime/
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

The editor receives access to the project root.

It does not need to understand every file in the project, but it needs enough information to locate:

- assets
- levels
- project configuration
- the project-specific runtime integration used by the editor

The internal source-code structure remains mostly up to the developer.

---

## 3. Project Manifest

Every editor-compatible project should contain a project manifest in its root.

Example:

```text
game.project.json
```

A possible initial structure is:

```json
{
  "version": 1,
  "name": "My Game",

  "paths": {
    "assets": "assets",
    "levels": "assets/levels",
    "sprites": "assets/sprites"
  },

  "editor": {
    "runtime": "dist/editor-runtime.js"
  }
}
```

The manifest serves as the entry point for tooling.

It identifies the selected directory as a valid game project and tells the editor where the relevant resources are located.

The editor should not require one rigid directory structure beyond the presence of the manifest itself.

For example, another project could use:

```json
{
  "version": 1,
  "name": "Another Game",

  "paths": {
    "assets": "game-data",
    "levels": "game-data/maps",
    "sprites": "game-data/textures"
  },

  "editor": {
    "runtime": "build/editor.js"
  }
}
```

---

## 4. Opening a Project

When the user selects a directory, the editor should follow this flow:

```text
Select project folder
        |
        v
Look for game.project.json
        |
    +---+---+
    |       |
   found   missing
    |       |
 validate   initialize project
    |       |
 load     create manifest
              |
              v
             load
```

### Existing manifest

If the manifest exists:

1. parse it
2. validate its structure
3. validate its version
4. verify configured paths
5. locate the project runtime integration
6. load the project

### Missing manifest

If the manifest does not exist, the selected folder is treated as an uninitialized project.

The editor should provide a setup flow allowing the developer to choose or confirm:

- assets directory
- levels directory
- sprites directory
- other asset directories if necessary
- project runtime/editor integration entry point

The editor then creates `game.project.json`.

If obvious conventional directories already exist, for example:

```text
assets/
assets/levels/
assets/sprites/
```

the editor can prefill those paths.

### Invalid manifest

An existing invalid manifest should not be silently replaced.

The editor should report the problem and allow the developer to correct or reconfigure it.

---

## 5. Filesystem Access

For the browser-based editor, filesystem access should use the File System Access API.

The user explicitly grants access by selecting the project directory.

The editor then keeps the resulting:

```ts
FileSystemDirectoryHandle
```

as the root handle for the project.

All project file access should happen relative to this root.

For example:

```text
assets/levels/main.json
assets/sprites/player.png
```

Absolute machine-specific paths must never be persisted into project data.

Avoid:

```text
/Users/user/projects/my-game/assets/sprites/player.png
```

because those paths are not portable across machines.

---

## 6. Editor Responsibilities

The editor owns the visual/content-authoring workflow, not the source-code implementation.

Typical editor responsibilities include:

```text
Editor
├── project settings
├── levels
├── entities
├── component values
├── sprites
├── audio
├── other assets
├── asset imports
├── scene inspection
├── edit mode
└── play/simulate mode
```

The editor may directly modify:

```text
assets/levels/*.json
```

and copy assets into directories such as:

```text
assets/sprites/
```

The developer continues to use a normal IDE for:

```text
src/
├── components/
├── systems/
├── gameplay/
├── runtime/
└── application code
```

---

## 7. Shared Project Model

The editor and game runtime should operate on the same project.

Conceptually:

```text
                 GAME PROJECT
                      |
         +------------+------------+
         |                         |
       Code                      Content
         |                         |
     Normal IDE                  Editor
         |                         |
 Components / Systems       Levels / Assets
         |                         |
         +------------+------------+
                      |
                 Game Runtime
```

The project files become the source of truth.

The editor does not generate temporary level files that then need to be manually copied into the game.

---

## 8. Level Workflow

The old workflow is:

```text
Editor
   |
export JSON
   |
copy/import JSON into game
   |
register level as an asset
   |
run game
```

The target workflow is:

```text
Editor opens project
        |
        v
Editor opens assets/levels/main.json
        |
        v
Developer edits level
        |
        v
Editor saves the same file directly
        |
        v
Game runtime loads that level from the project
```

The level belongs to the project.

The editor is only one tool capable of reading and modifying it.

---

## 9. Asset Management

The editor should scan asset directories configured by the project manifest.

For example:

```text
assets/sprites/
```

The editor can display all compatible assets in an asset browser.

Example:

```text
Sprites
├── player.png
├── enemy.png
├── tree.png
└── rock.png
```

When adding an asset, the user selects a source file from elsewhere on the machine.

The editor copies that file into the appropriate project asset directory.

For example:

```text
Downloads/tree.png
```

becomes:

```text
my-game/assets/sprites/tree.png
```

The copied asset becomes part of the project.

---

## 10. Asset References

Serialized level data should never contain absolute filesystem paths.

Initially, project-relative or asset-relative paths are sufficient.

Example:

```json
{
  "sprite": "sprites/player.png"
}
```

The runtime resolves this relative to the configured asset directory.

Long term, stable asset IDs may be introduced.

Example:

```json
{
  "sprite": "7cff1ec2-452f-411d-a1d4-8e409e254321"
}
```

An asset registry could then resolve that ID to:

```text
assets/sprites/player.png
```

Stable IDs would allow assets to move without breaking references.

This is a later improvement and is not required for the first version.

---

## 11. Generic Editor vs Project-Specific Code

The editor itself should remain generic.

It should not statically import the components and systems of one particular game.

Instead, every project provides a project-specific runtime integration.

Conceptually:

```text
Generic Editor
      |
      v
Project Runtime Integration
      |
      +-- Components
      +-- Systems
      +-- Project initialization
      +-- Optional editor-specific setup
```

When Project A is opened, Project A provides its runtime configuration.

When Project B is opened, Project B provides a different runtime configuration.

The generic editor remains unchanged.

---

## 12. Project Runtime Entry Point

Each game project should expose one explicit runtime entry point for the editor.

For example:

```text
my-game/
└── editor-runtime/
    └── index.ts
```

Conceptually:

```ts
export function configureEditorRuntime(runtime: Runtime) {
  runtime.registerComponent(PlayerComponent);
  runtime.registerComponent(EnemyComponent);

  runtime.registerSystem(PlayerMovementSystem);
  runtime.registerSystem(EnemyAISystem);
}
```

The editor does not need to discover individual component and system source files.

The project itself decides what should be registered.

This creates a clear integration boundary between the generic editor and the project.

---

## 13. Runtime Bundling

Because the editor runs in a browser, it should not attempt to directly import arbitrary TypeScript source files from a selected filesystem directory.

Instead, the project's editor integration should be built into a JavaScript bundle.

Example:

```text
editor-runtime/index.ts
        |
        | build
        v
dist/editor-runtime.js
```

The manifest then references the resulting bundle:

```json
{
  "editor": {
    "runtime": "dist/editor-runtime.js"
  }
}
```

The project build tool may use Vite, esbuild, Rollup, or another suitable bundler.

The important architectural point is that the editor consumes a known project runtime artifact rather than trying to dynamically compile arbitrary TypeScript source code itself.

---

## 14. Game Runtime and Editor Runtime

The game and editor can have different runtimes.

They do not have to execute exactly the same application environment.

For example:

```text
GAME RUNTIME
------------
game loop
input
rendering
physics
audio
gameplay
level transitions
shipping behavior
```

while the editor runtime may contain:

```text
EDITOR RUNTIME
--------------
scene viewport
selection
gizmos
inspector
asset browser
editor camera
undo/redo
edit mode
play mode
```

These are different applications and may have different runtime behavior.

However, both need access to the same project gameplay code when appropriate.

---

## 15. Shared Gameplay Code

The game's ECS components and gameplay systems should normally be shared between the real game runtime and editor play mode.

For example:

```text
                  PlayerMovementSystem
                          |
              +-----------+-----------+
              |                       |
         Game Runtime            Editor Play Mode
```

The editor should not reimplement project systems merely for testing.

Otherwise the editor could behave differently from the actual game.

The same game systems should be reused wherever possible.

---

## 16. Shared Engine Core

A common engine core should sit below both runtimes.

Conceptually:

```text
                    ENGINE CORE
                        |
            +-----------+-----------+
            |                       |
       Game Runtime            Editor Runtime
            |                       |
         gameplay                 editing
```

The shared engine core may contain concepts such as:

```text
World
Entity
Component
System
Asset APIs
Level loading
Serialization
Core ECS functionality
```

The game runtime and editor runtime build different application behaviors on top of this shared foundation.

---

## 17. Project Gameplay Configuration

Projects should ideally define their gameplay registration once and reuse it.

For example:

```ts
export function configureGameplay(runtime: Runtime) {
  runtime.registerComponent(PlayerComponent);
  runtime.registerComponent(EnemyComponent);

  runtime.registerSystem(PlayerMovementSystem);
  runtime.registerSystem(EnemyAISystem);
}
```

The normal game runtime can use it:

```ts
export function configureGame(runtime: Runtime) {
  configureGameplay(runtime);

  // Additional game-only configuration
}
```

The editor runtime can also use it:

```ts
export function configureEditorRuntime(runtime: Runtime) {
  configureGameplay(runtime);

  // Additional editor-preview configuration
}
```

This avoids duplicating the list of components and systems between the game and editor.

---

## 18. Edit Mode vs Play Mode

Opening a level in the editor should not automatically mean that all gameplay systems are running.

The editor should distinguish between at least two states.

### Edit Mode

Used for authoring.

Typical behavior:

```text
Edit Mode
---------
level visible
entities selectable
component values editable
gizmos active
asset browser active
gameplay mostly stopped
```

Gameplay systems such as:

```text
EnemyAISystem
DamageSystem
PlayerInputSystem
LevelTransitionSystem
```

should generally not execute during normal editing.

Some engine/editor systems may still run when necessary.

For example:

```text
rendering
transform propagation
editor camera
selection rendering
```

### Play / Simulate Mode

When the user presses Play:

```text
Play
  |
  v
Create simulation/runtime world
  |
  v
load current level
  |
  v
enable project gameplay systems
  |
  v
run game
```

The project-specific systems are active in this mode.

This allows the developer to test the actual game behavior inside the editor.

---

## 19. Runtime Lifecycle When Switching Projects

The editor should treat project-specific runtime state as disposable.

For example:

```text
Open Project A
      |
      v
Load Project A runtime
      |
      v
Register Project A components/systems
```

When switching projects:

```text
Close Project A
      |
      v
Stop simulation
      |
      v
Destroy Project A world/runtime state
      |
      v
Clear project-specific registrations
      |
      v
Unload project integration
      |
      v
Load Project B
```

Project B can then register an entirely different set of components and systems.

For example:

```text
Project A
---------
PlayerComponent
EnemyComponent
CombatSystem
EnemyAISystem
```

while:

```text
Project B
---------
SpaceshipComponent
WeaponComponent
AsteroidSystem
ShipMovementSystem
```

The generic editor should support both without containing direct dependencies on either one.

---

## 20. Editor and Game Coupling

Coupling between the editor and project gameplay code is necessary if the editor must simulate the actual game.

The goal is therefore not to eliminate coupling.

The goal is to place that coupling behind a controlled interface.

Avoid:

```text
Generic Editor
   |
   +-- imports PlayerComponent
   +-- imports EnemyComponent
   +-- imports CombatSystem
   +-- imports EnemyAISystem
```

Prefer:

```text
Generic Editor
      |
      v
Project Runtime Interface
      |
      v
Game-specific components and systems
```

The editor depends on the interface.

The project supplies the implementation.

---

## 21. Editor and Runtime Relationship

During development, the workflow becomes:

```text
Developer
   |
   +------ IDE ----------------------+
   |                                 |
   |                          modifies source code
   |                                 |
   |                                 v
   |                           Components / Systems
   |                                 |
   |                                 |
   +------ Game Editor --------------+
                |
         modifies content
                |
                v
          Levels / Assets
                |
                v
            Project
                |
          +-----+-----+
          |           |
          v           v
     Game Runtime   Editor Play Mode
```

The editor and IDE can remain open simultaneously.

The IDE modifies implementation.

The editor modifies content.

Both operate on the same project.

---

## 22. Running the Game

Long term, the editor should support running the game directly from the selected project.

For example:

```text
Run Game
    |
    v
Project = my-game
Level   = main
```

The game runtime could conceptually support:

```bash
game-runtime --project ./my-game --level main
```

or an equivalent application API.

This is separate from editor Play Mode.

Two useful actions may therefore exist:

```text
Play
→ simulate inside editor

Run Game
→ launch actual game runtime
```

This distinction becomes valuable because the real game runtime may differ from the editor runtime.

---

## 23. Architectural Boundaries

The architecture should keep these concerns separate.

### Project System

Responsible for:

- project root
- manifest loading
- manifest validation
- configured paths
- locating project runtime integration
- project initialization

### Filesystem Layer

Responsible for:

- reading files
- writing files
- enumerating directories
- creating directories
- copying imported assets

### Asset System

Responsible for:

- discovering assets
- identifying asset types
- resolving asset references
- eventually assigning stable IDs

### Level System

Responsible for:

- loading level JSON
- saving level JSON
- entity definitions
- serialized level data

### Project Runtime Integration

Responsible for:

- exposing project-specific components
- exposing project-specific systems
- configuring project gameplay
- providing editor simulation integration

### Editor Runtime

Responsible for:

- scene viewport
- selection
- gizmos
- inspector
- asset browser
- project UI
- edit mode
- play/simulate mode

### Game Runtime

Responsible for:

- normal game execution
- production game loop
- input
- gameplay execution
- rendering
- audio
- physics
- level transitions

### Shared Engine Core

Responsible for common functionality required by both runtimes.

---

## 24. Recommended Initial Scope

The first implementation should focus on:

1. selecting a project directory
2. loading or creating `game.project.json`
3. resolving configured asset paths
4. directly editing level JSON files
5. listing sprites from the project
6. importing sprites into the project
7. using project-relative asset references
8. defining a project runtime entry point
9. building the project runtime integration into a browser-loadable bundle
10. loading the project-specific runtime when opening the project
11. separating Edit Mode from Play Mode
12. running project systems only during simulation when appropriate
13. cleaning up project-specific runtime state when switching projects

The following can come later:

```text
asset UUIDs
.meta files
asset import caches
compiled runtime assets
asset bundles
hot reload
dependency tracking
build pipelines
asset packing
advanced plugin APIs
runtime sandboxing
```

---

## 25. Core Architectural Principle

The game project is the central source of truth.

```text
                         Game Project
                              |
              +---------------+---------------+
              |               |               |
             IDE            Editor        Game Runtime
              |               |               |
         source code        content        execution
              |               |
              |          Editor Runtime
              |               |
              +-------+-------+
                      |
               Project Gameplay
            components + systems
                      |
                      v
                 Engine Core
```

The IDE owns the code-editing workflow.

The editor owns the visual/content-authoring workflow.

The game runtime owns the production execution environment.

The editor runtime owns the authoring and simulation environment.

Project-specific components and systems belong to the game project and can be consumed by both the game runtime and editor runtime through an explicit project integration boundary.

The editor itself remains generic and reusable across different game projects.