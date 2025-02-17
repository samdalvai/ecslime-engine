import AnimationComponent from '../components/AnimationComponent';
import SpriteComponent from '../components/SpriteComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';

export default class AnimationSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(SpriteComponent);
        this.requireComponent(AnimationComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const animation = this.registry.getComponent(entity, AnimationComponent);
            const sprite = this.registry.getComponent(entity, SpriteComponent);

            if (!animation || !sprite) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            if (!animation.isLoop && animation.currentFrame === animation.numFrames - 1) {
                return;
            }

            animation.currentFrame =
                Math.round(((performance.now() - animation.startTime) * animation.frameSpeedRate) / 1000) %
                animation.numFrames;
            sprite.srcRect.x = animation.currentFrame * sprite.width;
        }
    }
}
