import { Camera, PhysicsBridge, System } from 'ecslime-engine';
import type { Vector } from 'ecslime-engine';

import { RigidBodyComponent } from '../components';
import TransformComponent from '../components/TransformComponent';

export default class DebugPhysicsBody extends System {
    constructor() {
        super();
        this.requireComponent(TransformComponent);
        this.requireComponent(RigidBodyComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Camera, physicsBridge: PhysicsBridge) {
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
                    this.drawCircle(ctx, shape.radius);
                    break;
                case 'polygon':
                    this.drawPolygon(ctx, shape.vertices);
                    break;
                case 'box':
                    this.drawBox(ctx, shape.width, shape.height);
                    break;
                case 'capsule':
                    this.drawCapsule(ctx, shape.halfHeight, shape.radius);
                    break;
                case 'segment':
                    this.drawSegment(ctx, shape.length, shape.horizontal);
                    break;
            }

            ctx.restore();
        }
    }

    private drawCircle(ctx: CanvasRenderingContext2D, radius: number, color = 'white') {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Make the body's rotation visible for otherwise symmetrical circles.
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
    }

    private drawPolygon(ctx: CanvasRenderingContext2D, vertices: readonly Vector[], color = 'white') {
        if (vertices.length === 0) return;

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        this.drawCenter(ctx, color);
    }

    private drawBox(ctx: CanvasRenderingContext2D, width: number, height: number, color = 'white') {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
        ctx.strokeStyle = color;
        ctx.stroke();

        this.drawCenter(ctx, color);
    }

    private drawCapsule(ctx: CanvasRenderingContext2D, halfHeight: number, radius: number, color = 'white') {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(-radius, -halfHeight);
        ctx.arc(0, -halfHeight, radius, Math.PI, 0);
        ctx.lineTo(radius, halfHeight);
        ctx.arc(0, halfHeight, radius, 0, Math.PI);
        ctx.closePath();
        ctx.stroke();

        this.drawCenter(ctx, color);
    }

    private drawSegment(
        ctx: CanvasRenderingContext2D,
        length: number,
        horizontal: boolean,
        color = 'white',
    ) {
        const halfLength = length / 2;
        const startX = horizontal ? -halfLength : 0;
        const startY = horizontal ? 0 : -halfLength;
        const endX = horizontal ? halfLength : 0;
        const endY = horizontal ? 0 : halfLength;

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        this.drawCenter(ctx, color, 2);
    }

    private drawCenter(ctx: CanvasRenderingContext2D, color: string, radius = 1) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
