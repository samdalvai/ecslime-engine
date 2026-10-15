import Engine from '../Engine';
import AssetStore from '../asset-store/AssetStore';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import Entity from '../ecs/Entity';
import System from '../ecs/System';
import { Camera, Flip, WorldBounds } from '../types/utils';
import { getCameraBounds, getSpriteBounds, worldBoundsOverlap } from '../utils/coordinates';

export default class RenderSystem extends System {
    private renderQueue: {
        entity: Entity;
        sprite: SpriteComponent;
        transform: TransformComponent;
    }[] = [];

    constructor() {
        super();
        this.requireComponent(SpriteComponent);
        this.requireComponent(TransformComponent);
    }

    update(ctx: CanvasRenderingContext2D, assetStore: AssetStore, camera: Camera, isEditor = false) {
        const cameraBounds = getCameraBounds(camera);
        const mapBounds: WorldBounds = { left: 0, right: Engine.mapWidth, bottom: 0, top: Engine.mapHeight };

        for (const entity of this.getSystemEntities()) {
            const sprite = entity.getComponent(SpriteComponent);
            const transform = entity.getComponent(TransformComponent);

            const spriteBounds = getSpriteBounds(
                transform.position,
                { width: sprite.width, height: sprite.height },
                transform.scale,
            );

            // Fixed entities are screen-space and are rendered independently of world culling.
            if (
                !transform.isFixed &&
                (!worldBoundsOverlap(spriteBounds, cameraBounds) ||
                    (!isEditor && !worldBoundsOverlap(spriteBounds, mapBounds)))
            ) {
                continue;
            }

            this.renderQueue.push({ entity, sprite, transform });
        }

        this.renderQueue.sort((entityA, entityB) => {
            if (entityA.sprite.zIndex === entityB.sprite.zIndex) {
                // Draw lower entities last so they appear in front in a top-down Y-up world.
                return entityB.transform.position.y - entityA.transform.position.y;
            }

            return entityA.sprite.zIndex - entityB.sprite.zIndex;
        });

        for (const { entity, sprite, transform } of this.renderQueue) {
            this.drawEntity(ctx, assetStore, entity, sprite, transform);
        }

        this.renderQueue.length = 0;
    }

    /**
     * Called for each visible entity right before its sprite is drawn, in render order.
     * Override to draw game specific decorations below the sprite (e.g. shadows).
     */
    protected drawBeforeSprite(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ctx: CanvasRenderingContext2D,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        entity: Entity,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sprite: SpriteComponent,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transform: TransformComponent,
    ): void {}

    private drawEntity(
        ctx: CanvasRenderingContext2D,
        assetStore: AssetStore,
        entity: Entity,
        sprite: SpriteComponent,
        transform: TransformComponent,
    ) {
        if (!sprite.isVisible) return;

        const width = sprite.width * transform.scale.x;
        const height = sprite.height * transform.scale.y;

        this.drawBeforeSprite(ctx, entity, sprite, transform);

        ctx.save();

        if (transform.isFixed) {
            // Fixed transforms use screen coordinates and must not inherit the world transform.
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        ctx.translate(transform.position.x, transform.position.y);

        if (transform.rotation) {
            ctx.rotate((transform.rotation * Math.PI) / 180);
        }

        // The world pass flips Y; counter-flip bitmap pixels so sprites remain upright.
        ctx.scale(1, -1);

        switch (sprite.flip) {
            case Flip.HORIZONTAL:
                ctx.scale(-1, 1);
                break;
            case Flip.VERTICAL:
                ctx.scale(1, -1);
                break;
            case Flip.NONE:
                break;
        }

        if (sprite.transparency !== 1) {
            ctx.globalAlpha = sprite.transparency;
        }

        ctx.drawImage(
            assetStore.getTexture(sprite.assetId),
            sprite.width * sprite.column,
            sprite.height * sprite.row,
            sprite.width,
            sprite.height,
            -width / 2,
            -height / 2,
            width,
            height,
        );
        ctx.restore();
    }
}
