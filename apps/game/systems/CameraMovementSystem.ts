import { Camera, Engine, System, TransformComponent, clampCameraCenter, screenToWorld } from 'ecslime-engine';

import CameraFollowComponent from '../components/CameraFollowComponent';

export default class CameraMovementSystem extends System {
    constructor() {
        super();
        this.requireComponent(CameraFollowComponent);
        this.requireComponent(TransformComponent);
    }

    update(camera: Camera) {
        for (const entity of this.getSystemEntities()) {
            const transform = entity.getComponent(TransformComponent);

            // Transform positions are entity centres in standard world space.
            camera.center = clampCameraCenter(
                {
                    ...camera,
                    center: { x: Math.floor(transform.position.x), y: Math.floor(transform.position.y) },
                },
                { width: Engine.mapWidth, height: Engine.mapHeight },
            );

            Engine.mousePositionWorld = screenToWorld(Engine.mousePositionScreen, camera);
        }
    }
}
