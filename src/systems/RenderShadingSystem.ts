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
                continue; // Skip if context is not available
            }

            // Set canvas dimensions to match the sprite
            canvas.width = entitySprite.width;
            canvas.height = entitySprite.height;

            // Draw the sprite onto the temporary canvas
            tempCtx.drawImage(entitySprite, 0, 0);

            // Get the image data from the canvas
            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data; // Pixel data array (RGBA)

            // Loop through each pixel and set non-transparent pixels to black
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3]; // Alpha channel (transparency)
                if (alpha > 0) {
                    // If the pixel is not fully transparent
                    data[i] = 0; // Red channel to 0
                    data[i + 1] = 0; // Green channel to 0
                    data[i + 2] = 0; // Blue channel to 0
                    // Leave the alpha channel unchanged to preserve transparency
                }
            }

            // Put the modified image data back onto the canvas
            tempCtx.putImageData(imageData, 0, 0);

            // Draw the modified image onto the main canvas
            ctx.drawImage(canvas, 500, 500);
        }
    };
}
