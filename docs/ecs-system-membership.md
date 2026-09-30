# Automatic ECS system membership after component changes

## Current behavior

`Registry.update()` matches newly created entities to systems and removes killed entities. `Registry.addComponent()` and `Registry.removeComponent()` update an entity's component pool and signature, but do not revisit system membership. As a result, changing an existing entity's components requires a manual system update.

## Proposed implementation: changed-entity set

Keep a `Set<Entity>` in `Registry` for entities whose components changed. Add an entity to the set after its component pool and signature have been updated. A set coalesces several component changes to the same entity into one membership check per registry update.

At `Registry.update()`, reconcile each changed entity against the registered systems. Run this at a defined boundary before the next round of system updates, when systems are not iterating over their entity arrays. Skip entities scheduled for deletion. Clear the set after processing it and in `Registry.clear()`.

The reconciliation rule is:

```ts
private reconcileEntity(entity: Entity): void {
    const signature = this.getEntitySignature(entity);

    for (const system of this._systems.values()) {
        const matches = system.isInterestedIn(signature);
        const present = system.hasEntity(entity);

        if (matches && !present) system.addEntityToSystem(entity);
        if (!matches && present) system.removeEntityFromSystem(entity);
    }
}
```

Use the same routine for newly created entities, so creation and subsequent component changes apply the same matching rule. A system with no required components remains empty because `isInterestedIn()` returns `false` for a zero signature.

For `D` distinct changed entities and `S` systems, reconciliation takes approximately `O(D × S)` checks per update. Entities with no component changes need no checks.

## Timing and existing manual membership

Membership changes become visible at the next `registry.update()`. This avoids modifying a system's entity array during its own iteration: `System.removeEntityFromSystem()` removes by swapping in the last entity, which can affect an active loop. The game loop must place `registry.update()` before the system updates that should observe the change.

Some game code manually removes an entity from a system while leaving its required components attached. For example, teleport temporarily removes the player from rendering, collision, and movement. A later component change would make reconciliation add the player back. Before treating signature matching as the sole source of membership, represent these temporary exclusions explicitly, such as with a disabled marker or a per-system pause state. Then remove manual add/remove calls that merely compensate for component changes, including those in the editor.

## Verification cases

- Adding a required component to an existing entity adds it to the matching system on the next registry update.
- Removing a required component removes it on the next registry update.
- Several component changes to one entity before an update produce the correct final membership without duplicates.
- An entity changed and killed before an update is not added back to a system.
- A system requiring multiple components gains or loses an entity when the full signature starts or stops matching.
- Temporary system exclusions remain effective under the chosen exclusion mechanism.
