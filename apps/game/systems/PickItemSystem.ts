import { Entity, EventBus, System } from 'ecslime-engine';

import { HealthComponent, PickableItemComponent } from '../components';
import { PickupEffect } from '../components/PickableItemComponent';
import CollisionEvent from '../events/CollisionEvent';

export default class PickItemSystem extends System {
    constructor() {
        super();
        this.requireComponent(PickableItemComponent);
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(CollisionEvent, this, this.onCollision);
    }

    onCollision = (event: CollisionEvent) => {
        const entityA = event.a;
        const entityB = event.b;
        if (entityA.hasComponent(PickableItemComponent)) {
            this.handlePickItem(entityB, entityA);
        }

        if (entityB.hasComponent(PickableItemComponent)) {
            this.handlePickItem(entityA, entityB);
        }
    };

    handlePickItem = (entityPickingItem: Entity, pickedItem: Entity) => {
        const pickableItem = pickedItem.getComponent(PickableItemComponent);

        switch (pickableItem.effectOnPickup) {
            case PickupEffect.HEALTH:
                if (entityPickingItem.hasComponent(HealthComponent)) {
                    const health = entityPickingItem.getComponent(HealthComponent);

                    health.healthPercentage = Math.min(health.healthPercentage + pickableItem.effectValue, 100);
                    health.lastDamageTime = performance.now();
                    pickedItem.kill();
                }
                break;
            case PickupEffect.NONE:
                break;
            default:
                break;
        }
    };
}
