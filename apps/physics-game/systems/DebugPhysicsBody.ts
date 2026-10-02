import { Camera, PhysicsBridge, System, getCameraBounds, getColliderBounds, worldBoundsOverlap } from 'ecslime-engine';
import { BoxShape, ShapeType } from 'gravity.js';

import TransformComponent from '../components/TransformComponent';

export default class DebugPhysicsBody extends System {
    constructor() {
        super();
        this.requireComponent(TransformComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Camera, physicsBridge: PhysicsBridge) {
        // TODO: check camera bounds for entity culling
        const cameraBounds = getCameraBounds(camera);

        for (const entity of this.getSystemEntities()) {
            const transform = entity.getComponent(TransformComponent);

            if (!transform) {
                throw new Error('Could not find some component(s) of entity with id ' + entity.getId());
            }

            const physicsBody = physicsBridge.getPhysicsBodyByEntity(entity);
            const position = physicsBody.position;
            const shape = physicsBody.shape;

            switch (shape.getType()) {
                case ShapeType.CIRCLE:
                    // Not implemented
                    break;
                case ShapeType.POLYGON:
                    // Not implemented
                    break;
                case ShapeType.BOX:
                    {
                        const box = shape as BoxShape;
                        this.drawBox(ctx, position.x, position.y, box.width, box.height);
                    }
                    break;
                case ShapeType.CAPSULE:
                    // Not implemented
                    break;
                case ShapeType.SEGMENT:
                    // Not implemented
                    break;
            }
        }
    }

    private drawBox(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        color = 'white',
    ) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        ctx.beginPath();
        ctx.rect(x, y, halfWidth * 2, halfHeight * 2);
        ctx.strokeStyle = color;
        ctx.stroke();

        // draw the 1px center point like filledCircleColor(..., radius=1)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}
