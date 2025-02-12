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
            canvas.width = sprite.width;
            canvas.height = sprite.height;

            const srcRect: Rectangle = sprite.srcRect;

            const dstRect: Rectangle = {
                x: transform.position.x - (sprite.isFixed ? 0 : camera.x),
                y: transform.position.y - (sprite.isFixed ? 0 : camera.y),
                width: sprite.width * transform.scale.x,
                height: sprite.height * transform.scale.y,
            };

            // Draw the sprite onto the temporary canvas
            tempCtx.drawImage(
                entitySprite,
                srcRect.x,
                srcRect.y,
                srcRect.width,
                srcRect.height,
                0,
                0,
                dstRect.width,
                dstRect.height,
            );

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

            const flippedCanvas = document.createElement('canvas');
            flippedCanvas.width = canvas.width;
            flippedCanvas.height = canvas.height;
            const flippedCtx = flippedCanvas.getContext('2d');

            if (!flippedCtx) {
                continue; // Skip if context is not available
            }

            // Flip the image horizontally
            flippedCtx.save(); // Save the current context state
            flippedCtx.scale(1, -1); // Flip horizontally
            flippedCtx.drawImage(canvas, 0, -canvas.height); // Draw the flipped image
            flippedCtx.restore(); // Restore the context state

            // Draw the modified image onto the main canvas
            ctx.drawImage(flippedCanvas, dstRect.x + 20, dstRect.y);
        }
    };
}
