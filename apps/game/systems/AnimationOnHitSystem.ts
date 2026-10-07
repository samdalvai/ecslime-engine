import { EventBus, System } from 'ecslime-engine';

import AnimationComponent from '../components/AnimationComponent';
import LifetimeComponent from '../components/LifetimeComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import EntityHitEvent from '../events/EntityHitEvent';

export default class AnimationOnHitSystem extends System {
    constructor() {
        super();
    }

    subscribeToEvents = (eventBus: EventBus) => {
        eventBus.subscribeToEvent(EntityHitEvent, this, this.onEntityHit);
    };

    onEntityHit = (event: EntityHitEvent) => {
        const entity = event.entity;

        if (entity.hasComponent(TransformComponent) && entity.hasComponent(SpriteComponent)) {
            const { x, y } = event.hitPosition;
            const explosionAnimation = entity.registry.createEntity();
            explosionAnimation.addComponent(
                TransformComponent,
                {
                    x: x - 16,
                    y: y - 16,
                },
                { x: 1, y: 1 },
                0,
            );
            explosionAnimation.addComponent(SpriteComponent, 'explosion_small_blue', 32, 32, 3);
            explosionAnimation.addComponent(AnimationComponent, 7, 10, false);
            explosionAnimation.addComponent(LifetimeComponent, 500);
        }
    };
}
