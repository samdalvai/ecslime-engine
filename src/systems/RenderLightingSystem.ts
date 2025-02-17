import LightEmitComponent from '../components/LightEmitComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import { Rectangle } from '../types';

export default class RenderLightingSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(LightEmitComponent);
        this.requireComponent(TransformComponent);
        this.requireComponent(SpriteComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Rectangle) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = camera.width;
        tempCanvas.height = camera.height;

        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) {
            return;
        }

        tempCtx.fillStyle = 'rgba(0,0,0,0.5)';
        tempCtx.fillRect(0, 0, camera.width, camera.height);

        tempCtx.globalCompositeOperation = 'destination-out';
        tempCtx.shadowColor = 'black';
        tempCtx.shadowBlur = 15;

        for (const entity of this.getSystemEntities()) {
            const lightEmit = this.registry.getComponent(entity, LightEmitComponent);
            const transform = this.registry.getComponent(entity, TransformComponent);
            const sprite = this.registry.getComponent(entity, SpriteComponent);

            if (!lightEmit || !transform || !sprite) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            tempCtx.beginPath();
            tempCtx.arc(
                transform.position.x - camera.x + (sprite.width / 2) * transform.scale.x,
                transform.position.y - camera.y + (sprite.height / 2) * transform.scale.y,
                lightEmit.lightRadius,
                0,
                Math.PI * 2,
            );
            tempCtx.fill();
        }

        tempCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tempCanvas, 0, 0);
    }
}
