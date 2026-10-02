# ECSlime Engine

A JavaScript game engine for the browser. Built around an Entity Component System (ECS) architecture.

This project expands on the [JS 2D ECS Game Engine](https://github.com/samdalvai/js-2d-ecs-game-engine) by introducing:

- An **editor mode** for designing and managing game levels.
- Additional **game systems and mechanics**.

# Getting Started

## Prerequisites

- Node.js installed on your machine.

## Install dependencies

```
npm install
```

## Run in game mode

```
npm start
```

## Run in editor mode

```
npm run start:editor
```

## Clean build files

You may need to clean the build files when switching between game mode and editor mode:

```
npm run clean
```

# Editor Features

![Game editor](images/editor.png)

The editor provides tools to design and manage entities, components, and levels:

- Entity management

    - Entity creation
    - Adding, editing, or removing components on entities
    - Editing entities' tags and groups

- Map editing

    - Move entities on the map (with optional grid snapping)
    - Copy/Cut/Paste entities
    - Undo/Redo changes

- Import / Export

    - Export/Import entities to/from json files
    - Export/Import levels to/from json files

- Other Utilities
    - Test game systems
    - Load entity sprites
    - Persist levels to the browser's local storage

# Game example

A demonstration RPG-style 2D game built with this engine, where the player can cast spells and defeat enemies. Sprites have been created using [Piskel](https://www.piskelapp.com/p/create/sprite/). You can find a working demo of this game at this [link](https://samdalvai.github.io/ecslime-engine/).

![Game example](images/game.png)

# Project structure

```text
src/                    -> Reusable engine code and public API (index.ts)
apps/
    game/               -> Example game, components, events, and systems
    editor/             -> Editor for the example game
__tests__/
    src/                -> Tests for the engine, mirroring src/
    apps/
        game/           -> Tests for the example game
        editor/         -> Tests for the editor
spritesheets/           -> Game sprite sources
dist/assets/            -> Game assets
```

# Engine API

The reusable engine code lives under `src` and is exported through `src/index.ts`.
Game and editor code should import engine classes, types, and utilities from that public barrel instead of deep engine paths.

From files directly under `apps/game` or `apps/editor`:

```ts
import { Engine, RAFLoopStrategy } from '../../src';
```

From nested app folders such as `apps/game/components` or `apps/editor/systems`:

```ts
import { Component, System, Rectangle } from '../../../src';
```

`src` should not import from `apps/game` or `apps/editor`. App-specific components are provided to engine serialization and duplication through the game component catalog.

# Game Component Catalog

Serializable game components are exposed through `apps/game/components/componentCatalog.ts`. The catalog is built from the exports in `apps/game/components/index.ts` and is passed to engine APIs that need to resolve component names, such as deserialization and entity duplication.

When adding a component, export it from `apps/game/components/index.ts`; that makes it available to the editor and the `gameComponentCatalog`.

# How to develop a new game mechanic

If you want to develop a new game mechanic you can do so by performing these steps.

1. If needed create a new component for an entity under `apps/game/components`

```ts
import { Component } from '../../../src';

export default class MyNewComponent extends Component {
    myProperty: number;

    constructor(myProperty = 0) {
        super();
        this.myProperty = myProperty;
    }
}
```

2. Add your new component to the list of exported game components under `apps/game/components/index.ts`. This also makes the component available through `gameComponentCatalog`.

```ts
// ... other imports
export { default as TextLabelComponent } from './TextLabelComponent';
export { default as TransformComponent } from './TransformComponent';
export { default as MyNewComponent } from './MyNewComponent';
```

3. Create a new system under `apps/game/systems`

```ts
import { System } from '../../../src';
import MyNewComponent from '../components/MyNewComponent';

export default class MyNewSystem extends System {
    constructor() {
        super();
        this.requireComponent(MyNewComponent); // Require entities to have your component
        // Optionally add other required components
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const myComponent = entity.getComponent(MyNewComponent);

            myComponent.myProperty += 1; // Apply your system logic
        }
    }
}
```

4. Add your new system to the list of exported game systems under `apps/game/systems/index.ts`. This is needed to have the system available when in editor mode.

```ts
// ... other imports
export { default as RenderSystem } from './RenderSystem';
export { default as RenderTextSystem } from './RenderTextSystem';
export { default as MyNewSystem } from './MyNewSystem';
```

5. Register your system in `apps/game/Game.ts:setup()`

```ts
setup = async () => {
    // ... other registered systems
    this.registry.addSystem(Systems.MovementSystem);
    this.registry.addSystem(Systems.AnimationSystem);
    this.registry.addSystem(Systems.MyNewSystem); // Register you new system
}
```

6. Perform your update logic in `apps/game/Game.ts:update()` or `apps/game/Game.ts:render()`, depending on the type of system. For example, if a system needs to perform rendering, add it in the `render()` function.

```ts
update = (deltaTime: number) => {
    // ... other systems updates
    this.registry.getSystem(Systems.MovementSystem)?.update(deltaTime);
    this.registry.getSystem(Systems.AnimationSystem)?.update();
    this.registry.getSystem(Systems.MyNewSystem)?.update();
};
```

# License

This project is licensed under the [MIT License](LICENSE).
