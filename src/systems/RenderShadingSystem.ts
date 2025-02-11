import AssetStore from '../asset-store/AssetStore';
import ShadingComponent from '../components/ShadingComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import System from '../ecs/System';
import { Rectangle } from '../types';

export default class RenderShadingSystem extends System {
    constructor() {
        super();
        this.requireComponent(ShadingComponent);
        this.requireComponent(SpriteComponent);
        this.requireComponent(TransformComponent);
    }

    update = (ctx: CanvasRenderingContext2D, assetStore: AssetStore, camera: Rectangle) => {
        for (const entity of this.getSystemEntities()) {
            const sprite = entity.getComponent(SpriteComponent);
            const transform = entity.getComponent(TransformComponent);

            if (!sprite || !transform) {
                throw new Error('Could not find some component(s) of entity with id ' + entity.getId());
            }

            // Check if the entity sprite is outside the camera view
            const isOutsideCameraView =
                transform.position.x + transform.scale.x * sprite.width < camera.x ||
                transform.position.x > camera.x + camera.width ||
                transform.position.y + transform.scale.y * sprite.height < camera.y ||
                transform.position.y > camera.y + camera.height;

            // Cull sprites that are outside the camera viww (and are not fixed)
            if (isOutsideCameraView && !sprite.isFixed) {
                continue;
            }

            const entitySprite = assetStore.getTexture(sprite.assetId);

            const canvas = document.createElement('canvas');
            const tempCtx = canvas.getContext('2d');

            if (!tempCtx) {
                continue;
            }

            canvas.width = entitySprite.width;
            canvas.height = entitySprite.height;

            tempCtx.drawImage(entitySprite, 0, 0);

            // Get image data (pixel data) from the canvas
            const imageData = tempCtx.getImageData(0, 0, 32, 32); // Get 1x1 pixel data at (x, y)

            // The pixel data contains an array of RGBA values (in the form of [R, G, B, A])
            const pixel = imageData.data;
            const rgbData = [];

            for (let i = 0; i < pixel.length - 3; i += 4) {
                const rgba = {
                    r: pixel[i],
                    g: pixel[i + 1],
                    b: pixel[i + 2],
                    a: pixel[i + 3] / 255, // Alpha value in the range [0, 1]
                };

                rgbData.push(rgba);
            }

            console.log('rgbData: ', rgbData);
        }
    };
}
