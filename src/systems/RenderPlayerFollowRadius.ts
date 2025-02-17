import EntityFollowComponent from '../components/EntityFollowComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import { Rectangle } from '../types';

export default class RenderPlayerFollowRadius extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(TransformComponent);
        this.requireComponent(EntityFollowComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Rectangle) {
        for (const entity of this.getSystemEntities()) {
            const transform = this.registry.getComponent(entity, TransformComponent);
            const playerFollow = this.registry.getComponent(entity, EntityFollowComponent);

            if (!playerFollow || !transform) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            // Bypass rendering if entities are outside the camera view
            const isOutsideCameraView =
                transform.position.x + transform.scale.x < camera.x ||
                transform.position.x > camera.x + camera.width ||
                transform.position.y + transform.scale.y < camera.y ||
                transform.position.y > camera.y + camera.height;

            if (isOutsideCameraView) {
                continue;
            }

            const circleX = transform.position.x + playerFollow.offset.x - camera.x;
            const circleY = transform.position.y + playerFollow.offset.y - camera.y;

            ctx.beginPath();
            ctx.arc(circleX, circleY, playerFollow.detectionRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'red';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(circleX, circleY, playerFollow.minFollowDistance, 0, Math.PI * 2);
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
    }
}
