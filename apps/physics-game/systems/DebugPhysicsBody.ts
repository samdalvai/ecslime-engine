import { Camera, PhysicsBridge, System, getCameraBounds } from 'ecslime-engine';

import { RigidBodyComponent } from '../components';
import TransformComponent from '../components/TransformComponent';

export default class DebugPhysicsBody extends System {
    constructor() {
        super();
        this.requireComponent(TransformComponent);
        this.requireComponent(RigidBodyComponent);
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

            ctx.save();
            ctx.translate(position.x, position.y);
            ctx.rotate(physicsBody.rotation);

            switch (shape.kind) {
                case 'circle':
                    // Not implemented
                    break;
                case 'polygon':
                    // Not implemented
                    break;
                case 'box':
                    {
                        this.drawBox(ctx, shape.width, shape.height);
                    }
                    break;
                case 'capsule':
                    // Not implemented
                    break;
                case 'segment':
                    // Not implemented
                    break;
            }

            ctx.restore();
        }
    }

    private drawBox(ctx: CanvasRenderingContext2D, width: number, height: number, color = 'white') {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
        ctx.strokeStyle = color;
        ctx.stroke();

        // draw the 1px center point like filledCircleColor(..., radius=1)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}
