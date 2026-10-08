# ECSlime: Development Plan for a Production-Ready 2D Engine

## 1. Assessment and release scope

The best path is to strengthen the existing implementation, extract reusable capabilities from the demo, and make the editor safe and portable. Keep the current ECS storage model, Canvas 2D renderer, TypeScript, and DOM-based editor. A rewrite would add considerable work without addressing the most immediate problems.

The first production release will serve code-first JavaScript/TypeScript developers building small desktop-browser games. It will include a companion level editor, local autosave, portable project exports, and an extension point for a future physics library.

Breaking API changes are acceptable. Existing saved levels must have a migration path.

### Verified baseline

- All **225 tests across 30 suites pass**.
- TypeScript checking passes.
- Both application builds succeed.
- The repository-wide lint command fails with 275 errors, predominantly from generated files and configuration scope; the targeted source check reports no errors.
- Browser interaction and rendering were not exercised during this review. Successful builds do not establish browser correctness.
- No tracked source files were changed during the analysis.

| Area | Findings and implications |
|---|---|
| ECS | Packed component pools and deferred mutations are useful foundations. However, stale entity objects can access recycled IDs, inherited component classes can share IDs, late-added systems miss existing entities, and retagging/regrouping leaves stale indexes. These were reproduced directly. |
| Component capacity | Signatures support only 32 component types. The demo already exports 31. |
| Serialization | Class names and constructor-source parsing determine persistence. Serialization does not use the catalog's serializer hook; nested cloning shares references. Optimized builds are therefore a correctness concern. |
| Runtime | Global static state prevents clean instance isolation. There is no complete stop/dispose lifecycle. Simulation timing mixes frame deltas, wall-clock timestamps, and browser timers. |
| Events and input | Applications reset and rebuild subscriptions each frame. Input attaches globally, lacks teardown, and does not reliably handle focus loss or canvas ownership. |
| Loading | Loading clears the current world and assets before the replacement succeeds. Validation accepts malformed data, and some validators throw on `null`. |
| Reusability | Rendering, animation, movement, collision, audio, and essential components remain in the demo. The editor directly depends on that demo. |
| Editor | Existing selection, snapping, search, import/export, and undo features are worth preserving. Play uses the editing world; undo reloads assets; asynchronous failures can leave locks/loading states stuck. |
| Assets | The sprite picker reads a filename and searches existing demo directories rather than importing the selected file. Exported levels reference assets rather than containing a portable project. |
| Distribution | The package contains a Parcel-specific `url:` import; loading its advertised CommonJS entry directly fails. CI does not gate deployment on the full quality checks. |
| Performance | The grass level contains 1,961 entities and 634 colliders. Collision checks are pairwise, lighting creates a canvas each frame, and history stores unlimited full snapshots. The benchmark depends on an ignored reference directory. |

The core correctness work centers on `src/ecs/Registry.ts`, persistence changes on `src/serialization/serialization.ts`, and editor isolation on `apps/editor/Editor.ts`.

## 2. Architecture and public interfaces

Use **one repository and one npm package**, with separate public entry points for the core, reusable 2D runtime, and editor. Keep the two existing apps as consumers and examples.

The intended dependency direction is:

```text
ECS core + serialization
          ↑
Browser runtime + reusable 2D systems
          ↑
Game project definition
          ↑
Game app                 Editor app
```

The reusable editor accepts a project definition; it does not import the demo.

The principal interface changes are:

| Interface | Planned responsibility |
|---|---|
| `EngineOptions` | Explicit canvas, component catalog, system factory, timing configuration, and error callback. No hardcoded canvas ID. |
| `WorldContext` | Registry, events, simulation clock, world bounds, and access to runtime services. Replaces engine-wide mutable statics. |
| Engine lifecycle | Explicit `start`, `pause`, `resume`, `stop`, and `dispose`, with documented ownership and idempotency. |
| System lifecycle | Attach/dispose hooks and ordered update phases. Dependencies are explicit array order, without an automatic dependency graph. |
| Component definitions | Stable string identifiers, codecs, validation, defaults, and optional inspector metadata. Runtime IDs remain separate from saved identifiers. |
| Level/project documents | Versioned JSON containing authored data and asset identifiers. Runtime timers, input state, object references, and physics handles are excluded. |
| `ProjectDefinition` | Supplies component definitions and factories for game systems. Used by the game and editor play session. |
| Editor entry point | `mountEditor(root, projectDefinition)` returning a disposable editor instance. |

Preserve the existing Y-up, center-based world coordinates and degree-based transforms. Screen coordinates remain top-left/Y-down. Document seconds for simulation APIs; migrate existing millisecond-based duration fields where necessary.

For simplicity:

- Retain class components, packed pools, and deferred structural changes.
- Use `bigint` signatures behind the existing signature abstraction to remove the 32-type ceiling.
- Keep one active game world per engine.
- Keep synchronous typed events with explicit unsubscribe functions.
- Keep snapshot-based undo, with bounded history and deliberate edit transactions.
- Let custom physics integrate through ordinary systems and lifecycle hooks. Do not design a universal physics abstraction before inspecting the future physics library.

## 3. Implementation tasks

Estimates are **focused person-days for one experienced TypeScript developer**, including relevant tests and short documentation updates. Dependencies are mandatory prerequisites; tasks marked **independent** can start against the current repository.

### Foundation tasks

#### T01 — Establish reproducible checks and builds

**Effort: 2–3 days. Dependencies: independent.**

- Restrict linting to maintained source and configure Node/test environments correctly.
- Align CI and deployment on Node 24 and `npm ci`; run type checking, lint, tests, and both builds.
- Move checked-in assets out of build output and copy them during builds. Separate game/editor outputs so builds cannot overwrite each other.
- Add an initial browser smoke-test harness. Gate deployment on successful checks.

**Done when:** a clean checkout produces both apps without relying on existing output directories, and CI exercises the same commands developers use.

#### T02 — Repair ECS lifecycle and index invariants

**Effort: 3–5 days. Dependencies: independent.**

- Validate entity ownership and identity before registry operations. Because entities are objects, checking the registry's current object for an ID is sufficient; generation counters are unnecessary initially.
- Make repeated kills harmless and invalidate handles after deletion or clearing.
- Backfill matching entities when adding a system; reject accidental duplicate system registration.
- Update both directions of tag/group indexes when membership changes.
- Document deferred changes: reads see committed components; the last queued add/remove wins; deletion overrides pending changes. Add an explicit `flush()` name for synchronization.
- Restrict mutation queues and storage internals to internal use.

**Done when:** stale/foreign entities cannot access another entity, late system registration works, and mutation-order tests cover add/remove/kill combinations and iteration safety.

#### T03 — Remove component limits and fix class identity

**Effort: 1–2 days. Dependencies: T02.**

- Replace 32-bit signatures with `bigint`; raise the compilation target to ES2020.
- Allocate component and system IDs through constructor-keyed maps, avoiding inherited static IDs.
- Remove public ID-reset behavior that can invalidate live constructors/worlds.
- Keep signature representation out of the stable public API.

**Done when:** 128 distinct component types, subclassed components/systems, and multiple registries work without collisions.

#### T04 — Replace reflective serialization with explicit codecs

**Effort: 4–6 days. Dependencies: independent.**

- Make the component catalog the source of truth for serialization, deserialization, duplication, and editable fields.
- Replace constructor parsing and class-name lookup with stable identifiers and explicit codecs. Supply definitions for every demo component.
- Clone authored data through these codecs, eliminating shared nested references.
- Add versioned level validation with actionable entity/component/property paths. Validate finite numbers, arrays, required fields, unique tags/assets, and known component identifiers.
- Add a legacy migration that preserves authored values and discards transient runtime fields. Fix mismatches such as `isVisible` versus the constructor's `isVisibile` parameter.
- Reject unsupported versions and unknown components before changing the active world.

**Done when:** every bundled level migrates and round-trips, nested duplicates are independent, malformed input is rejected safely, and optimized code does not affect persistence.

#### T05 — Introduce instance-owned runtime state and disposal

**Effort: 4–6 days. Dependencies: independent.**

- Replace mutable `Engine`/`Editor` statics with instance-owned context/session objects.
- Accept an explicit canvas and size it from its container.
- Implement lifecycle methods that own RAF callbacks, listeners, observers, subscriptions, timers, and resources.
- Clean up partially initialized engines when startup fails.
- Route startup/runtime failures to a supplied error callback and a useful demo/editor error display.

**Done when:** two engines can coexist independently, repeated mount/dispose cycles leave no active resources, and initialization failure is recoverable.

#### T06 — Stabilize input and event subscriptions

**Effort: 3–5 days. Dependencies: T05.**

- Key events by constructor identity; return an unsubscribe function from subscription.
- Subscribe when a system/session attaches and unsubscribe on disposal. Remove per-frame reset/resubscribe behavior.
- Scope keyboard actions to the focused game/editor surface; respect text inputs and dialogs.
- Use Pointer Events and pointer capture for dragging. Reset held input on blur, visibility changes, and cancellation.
- Expose held/pressed/released state and a small configurable action map.
- Coalesce pointer motion and wheel input instead of retaining unbounded event queues.

**Done when:** the first input is delivered, subscriptions do not multiply, typing does not trigger game shortcuts, and dragging outside the canvas cannot leave the editor stuck.

#### T07 — Standardize simulation time and system scheduling

**Effort: 4–6 days. Dependencies: T02, T05, T06.**

- Use RAF for presentation with a default 60 Hz fixed simulation accumulator, a 250 ms elapsed-time clamp, and at most five catch-up steps.
- Reset accumulated time on resume. Hidden tabs pause simulation by default.
- Introduce a simulation clock and cancellable simulation timers; migrate animation, cooldowns, lifetimes, effects, and delayed demo actions away from wall-clock time.
- Use explicit ordered phases: input, gameplay, motion/physics, post-physics, and rendering. Flush structural changes at documented boundaries.
- Deliver one-shot input once even when a rendered frame contains several simulation steps. Keep rendering free of gameplay mutations.

**Done when:** different presentation rates produce equivalent simulated movement; pausing freezes timers; delayed actions cannot affect a replacement level.

#### T08 — Make asset and level loading transactional

**Effort: 4–6 days. Dependencies: T04, T05, T07.**

- Separate cached level documents from active world resources; clearing a level must not erase the means to reload it.
- Validate and prepare a candidate world and its assets before swapping it into the engine.
- Keep the previous world usable on failure. Cancel obsolete loads and prevent earlier requests from replacing later selections.
- Deduplicate asset IDs and concurrent requests; add progress, cancellation, timeout, and retry support.
- Reuse unchanged assets across undo and level reloads. Dispose resource scopes and object URLs explicitly.
- Replace the Parcel-only default-image import with a lazily created fallback texture.

**Done when:** failed textures, invalid components, cancelled loads, rapid switching, and restart operations preserve a coherent world and release unused resources.

### Reusable engine and editor tasks

#### T09 — Extract reusable 2D capabilities and project configuration

**Effort: 5–8 days. Dependencies: T04, T07.**

- Move transforms, sprites, animation, cameras, text, velocity-based movement, lifetime, and basic rendering into the reusable runtime.
- Keep RPG rules—health, spells, enemies, drops, player controls, and directional sprite conventions—in the demo.
- Remove player tags, obstacle group names, and game-specific status from generic systems.
- Introduce `ProjectDefinition` and a shared system factory so game execution and editor play use identical configuration.
- Preserve the existing demo as an integration example.

**Done when:** a second minimal game can use the runtime and editor with custom components without importing or modifying the demo.

#### T10 — Correct rendering, geometry, and animation behavior

**Effort: 3–5 days. Dependencies: T09.**

- Separate world and screen rendering passes; fix screen sprites receiving the world bitmap flip.
- Make canvas scaling device-pixel-ratio aware while retaining logical coordinates for input and camera calculations.
- Make picking, bounds, and drawing agree for rotation and mirrored sprites. Normalize bounds correctly.
- Ensure zero-length direction calculations return finite results.
- Fix non-looping animations to clamp to their final frame; support named clips with explicit frame lists and completion notification.
- Reuse the lighting canvas and resize it only when needed.

**Done when:** visual fixtures cover world/HUD orientation, zoom, DPR 1/2, rotated/mirrored sprites, edge culling, and animation completion.

#### T11 — Generalize simple collisions and leave a physics integration seam

**Effort: 3–5 days. Dependencies: T09.**

- Extract AABB detection with layers/masks, sensors, and enter/stay/exit events.
- Replace all-pairs candidate generation with a simple uniform grid. Deduplicate pairs and test results against brute force.
- Keep demo-specific obstacle response in demo systems; document the built-in collision model's limitations.
- Treat collision normals as immutable event data and skip entities already pending deletion.
- Define motion ownership: a physics-controlled entity is not also integrated by the default movement system.
- Provide an example integration system showing body creation/removal, fixed stepping, transform synchronization, and disposal using a fake backend.

**Done when:** collision behavior is independent of demo tags, event semantics are tested, and an external physics system can own motion without changing the engine.

Actual integration of the future physics library remains a separate task.

#### T12 — Provide reliable audio playback

**Effort: 2–4 days. Dependencies: T08, T09.**

- Add a small Web Audio service with decoded buffers, independent playback voices, looping, stop handles, master volume, and mute.
- Unlock/resume audio after user interaction and report failures without crashing gameplay.
- Stop world-owned voices on unload/dispose and define pause behavior.
- Remove the current behavior where replaying a sound restarts a shared audio element.

**Done when:** overlapping effects, looping music, pause/resume, blocked autoplay, and level disposal behave correctly.

#### T13 — Make editor history and play mode safe

**Effort: 6–9 days. Dependencies: T04, T08, T09.**

- Introduce an `EditorSession` owning the editing world, selection, history, dirty state, and operations.
- Keep the editing world as authoring state; create a separate disposable runtime from its serialized snapshot for play.
- Suspend editing while playing. Stopping play restores the untouched editing session without saving gameplay changes.
- Retain snapshot undo with a default limit of 100 entries or 32 MiB per level, whichever is reached first.
- Commit one history entry per completed drag, paste, component change, or field edit—not per pointer movement.
- Decouple saving from whether inspector DOM elements exist.
- Release operation locks in `finally` blocks; clear stale selection after whole-world replacement.

**Done when:** repeated play/stop preserves authored data, undo remains available after failures, and history stays bounded.

#### T14 — Make the inspector and editing operations dependable

**Effort: 4–6 days. Dependencies: T13.**

- Generate inspectors from catalog metadata rather than enumerating arbitrary runtime properties.
- Support validated numbers, vectors, enums, asset selectors, and nested/list data; use a validated JSON field for uncommon complex values.
- Preserve invalid text as an edit draft rather than writing `NaN` into components.
- Add visible validation messages, dirty/save-failed indicators, keyboard focus handling, and functional undo/redo disabled states.
- Preserve current selection/search/snapping features; add frame-selection, keyboard nudging, and numeric transform controls.
- Make entity paste atomic; strip unique tags from duplicates so copies cannot collide with originals.

**Done when:** a custom component receives a usable inspector, invalid edits cannot corrupt levels, and common editing operations work through keyboard and pointer input.

#### T15 — Implement portable projects and durable local storage

**Effort: 5–8 days. Dependencies: T08, T13.**

- Store project documents and imported asset blobs in IndexedDB; keep small UI preferences in localStorage.
- Migrate existing `level:*` records non-destructively. Retain original data until migration succeeds.
- Import actual selected image/audio files, assign asset IDs, and manage replacement/deletion references.
- Export/import a ZIP containing a manifest, versioned level JSON, and relative asset files. Keep individual level/entity JSON export.
- Handle quota errors, malformed archives, missing assets, and duplicate IDs before committing changes.
- Use revision checks to detect another tab's changes rather than silently overwriting them.
- Keep autosave frequent and expose save completion/failure; do not depend on an asynchronous unload save.

**Done when:** an exported project opens in a fresh browser profile with its assets intact, storage failure leaves recoverable in-memory work, and existing local levels migrate.

### Distribution and release tasks

#### T16 — Produce a genuinely reusable package

**Effort: 3–5 days. Dependencies: T01, T09, T13, T15.**

- Publish browser-oriented ESM and declarations, with core, 2D, and editor subpath exports. Use ESM-only for the cleaned-up API.
- Ensure importing core does not access browser globals or pull in editor code.
- Expose editor styles separately and reduce both apps to configuration/bootstrap code.
- Add a prepack build and test the actual npm tarball from a separate consumer directory.
- Verify the tarball in Parcel and a small Vite consumer without repository aliases.
- Enable optimized builds for both apps after serialization fixes.
- Remove incidental storage internals and reflection helpers from the supported API.

**Done when:** an external project installs the tarball, type-checks, runs, builds, and loads saved levels without special bundler configuration.

#### T17 — Establish performance budgets and fix measured bottlenecks

**Effort: 3–5 days. Dependencies: T10, T11, T13, T15.**

- Replace the ignored-reference benchmark dependency with checked-in reproducible workloads.
- Measure ECS churn, steady updates, collisions, rendering, loading, serialization, and editor history.
- Add optional per-system timing, entity/asset counts, candidate-pair counts, and frame-time percentiles.
- Use the grass level as a representative workload; add approximately 2,000-sprite/700-collider and 10,000-entity core stress scenes.
- Target 60 FPS for the representative scene at 1080p/DPR 1 on a documented reference machine, with p95 update/render work below 16.7 ms.
- Profile before further optimization. Keep larger ECS, rendering, or worker rewrites outside this task.

**Done when:** reproducible reports demonstrate the target or identify a documented release-blocking bottleneck, and repeated load/play cycles show no growing live-resource counts.

#### T18 — Deliver a starter and usable documentation

**Effort: 4–6 days. Dependencies: T14, T15, T16.**

- Provide a small template with one player, one custom component, one custom system, a level, and editor configuration.
- Document lifecycle, mutation timing, coordinates, units, assets, serialization, system order, and physics integration.
- Include tutorials for importing an asset, editing a level, running it, and building static deployment output.
- Publish the API migration guide and saved-level migration behavior.
- Document supported browsers, performance envelope, known limits, and contribution/release commands.

**Done when:** the template works outside this repository and its documented workflow has been followed from a clean checkout.

#### T19 — Complete browser validation and release qualification

**Effort: 5–8 days. Dependencies: T12, T16, T17, T18.**

- Expand the initial browser suite across Chromium, Firefox, and WebKit using optimized builds. Perform a manual Safari release smoke test as well.
- Cover startup, editor create/edit/save/reload, undo/redo, project export/import, play/stop, resize, focus loss, audio activation, and level transitions.
- Exercise invalid files, missing resources, storage failures, rapid switching, disposal, and legacy migrations.
- Add a long-running demo/editor soak test and a clean-package consumption check.
- Make failures retain useful logs/screenshots. Keep diagnostics local by default.
- Publish a prerelease, fix release-blocking issues, and document the release and rollback procedure.

**Done when:** all release gates pass, no known data-loss or runtime-corruption issues remain, and the package, demo, editor, and starter use the same release artifact.

## 4. Sequence, effort, and release gates

Dependencies above define the execution order. Tasks within a numbered range are not automatically sequential.

Useful independent starting points are **T01, T02, T04, and T05**. After extraction, rendering and collision work can proceed independently; audio can proceed alongside editor work once its prerequisites are ready.

| Gate | Tasks | Effort | Required outcome |
|---|---|---:|---|
| **A — Dependable foundations** | T01–T08 | **25–39 days** | Correct entity lifecycle, stable persistence, isolated runtime state, predictable timing, and recoverable loading. |
| **B — Reusable development workflow** | T09–T15 | **28–45 days** | Generic 2D capabilities, safe editing/play, custom components, and portable projects. |
| **C — Public production release** | T16–T19 | **15–24 days** | External package consumption, measured performance, documentation, and browser qualification. |
| **Total** | T01–T19 | **68–108 days** | First production release within the agreed scope. |

Budget approximately **85–135 person-days including 25% contingency**: around **17–27 full-time working weeks** for one developer. These are planning estimates, not a deadline commitment; editor migration and browser integration carry the most uncertainty.

Tests belong in each implementation task. T19 consolidates release validation; it is not the first time integration tests should run.

The strongest release acceptance scenario is:

> A developer creates a game from the starter, adds a custom component/system, imports assets, edits and exports a level, runs it in the game, installs an optimized package build, and deploys the result without modifying engine internals.

The editor must additionally preserve work through failed imports, failed saves, failed loads, undo operations, and play sessions.

## 5. Separate follow-up features

These are useful improvements, but do not need to delay the production release above.

| Task | Effort | Dependencies | Deliberately limited first implementation |
|---|---:|---|---|
| **Tile layers and painting** | 6–10 days | T10, T14, T15 | Finite orthogonal tile layers, tileset palette, brush/erase/fill, visible-range rendering, and simple solid-tile collision data. Existing entity-based terrain remains supported. |
| **Reusable entity stamps** | 2–4 days | T04, T14, T15 | Named serialized entity/group templates instantiated as independent copies. Defer inheritance and automatic propagation. |
| **Future physics library integration** | 1–2 days assessment; provisionally 5–10 days integration | T07, T11; library source/API available | Map units, body ownership, stepping, contacts, teleports, serialization boundaries, and disposal. Re-estimate after inspecting the library. |
| **Mobile browser support** | 5–10 days | T06, T10, T19 | Touch actions, virtual controls, responsive game surfaces, and device performance testing. Treat mobile editing as a separate scope. |

Defer WebGL/WebGPU rendering, archetype ECS conversion, workers, visual scripting, networking, cloud accounts, collaborative editing, and a plugin marketplace until a demonstrated requirement justifies them.

The intended first release is a small, dependable engine with a trustworthy editing workflow and clear extension points. Its production readiness should come from correctness, portability, recoverability, and documented behavior.
