import { EventBus, System } from 'ecslime-engine';

import DeadBodyOnDeathComponent from '../components/DeadBodyOnDeathComponent';
import LifetimeComponent from '../components/LifetimeComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import ShadowComponent from '../components/ShadowComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import EntityKilledEvent from '../events/EntityKilledEvent';

export default class DeadBodyOnDeathSystem extends System {
    constructor() {
        super();
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(EntityKilledEvent, this, this.onEntityDeath);
    }

    onEntityDeath = (event: EntityKilledEvent) => {
        const entity = event.entity;

        if (
            entity.hasComponent(DeadBodyOnDeathComponent) &&
            entity.hasComponent(SpriteComponent) &&
            entity.hasComponent(TransformComponent) &&
            entity.hasComponent(RigidBodyComponent)
        ) {
            const sprite = entity.getComponent(SpriteComponent);
            const transform = entity.getComponent(TransformComponent);
            const rigidBody = entity.getComponent(RigidBodyComponent);

            const registry = entity.registry;

            const deadBody = registry.createEntity();
            deadBody.addComponent(
                TransformComponent,
                { ...transform.position },
                { ...transform.scale },
                transform.rotation,
            );
            deadBody.addComponent(RigidBodyComponent, { x: 0, y: 0 }, { ...rigidBody.direction });

            let spriteOffset = 0;

            if (rigidBody.direction.x > 0) {
                spriteOffset = 1;
            } else if (rigidBody.direction.y < 0) {
                spriteOffset = 2;
            } else if (rigidBody.direction.x < 0) {
                spriteOffset = 3;
            }

            deadBody.addComponent(
                SpriteComponent,
                sprite.assetId,
                sprite.width,
                sprite.height,
                sprite.zIndex,
                12 + spriteOffset,
            );
            deadBody.addComponent(LifetimeComponent, 5000);

            if (entity.hasComponent(ShadowComponent)) {
                const shadow = entity.getComponent(ShadowComponent);

                deadBody.addComponent(ShadowComponent, shadow.width, shadow.height, shadow.offsetX, shadow.offsetY);
            }
        }
    };
}
