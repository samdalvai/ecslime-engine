import { System } from 'ecslime-engine';

import AnimationComponent from '../components/AnimationComponent';
import EntityEffectComponent from '../components/EntityEffectComponent';
import SpriteComponent from '../components/SpriteComponent';

export default class AnimationSystem extends System {
    constructor() {
        super();
        this.requireComponent(SpriteComponent);
        this.requireComponent(AnimationComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const animation = entity.getComponent(AnimationComponent);
            const sprite = entity.getComponent(SpriteComponent);

            if (!animation.isLoop && animation.currentFrame === animation.numFrames - 1) {
                continue;
            }

            let slowedPercentage = 1;

            if (entity.hasComponent(EntityEffectComponent)) {
                const entityEffect = entity.getComponent(EntityEffectComponent);

                if (entityEffect.slowed) {
                    slowedPercentage = entityEffect.slowedPercentage;
                }
            }

            animation.currentFrame =
                Math.round(
                    ((performance.now() - animation.startTime) * animation.frameSpeedRate * slowedPercentage) / 1000,
                ) % animation.numFrames;
            sprite.column = animation.currentFrame;
        }
    }
}
