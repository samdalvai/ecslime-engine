import { Camera, System, getCameraBounds, worldBoundsOverlap } from 'ecslime-engine';

import EntityDestinationComponent from '../components/EntityDestinationComponent';

export default class DebugEntityDestinationSystem extends System {
    constructor() {
        super();
        this.requireComponent(EntityDestinationComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Camera) {
        const cameraBounds = getCameraBounds(camera);

        for (const entity of this.getSystemEntities()) {
            const destination = entity.getComponent(EntityDestinationComponent);

            const bounds = {
                left: destination.destinationX - 20,
                right: destination.destinationX + 20,
                bottom: destination.destinationY - 20,
                top: destination.destinationY + 20,
            };
            if (!worldBoundsOverlap(bounds, cameraBounds)) {
                continue;
            }

            ctx.beginPath();
            ctx.arc(destination.destinationX, destination.destinationY, 20, 0, Math.PI * 2);
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
    }
}
