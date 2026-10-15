import { RenderSystem as EngineRenderSystem, Entity, SpriteComponent, TransformComponent } from 'ecslime-engine';

import HighlightComponent from '../components/HighlightComponent';
import ShadowComponent from '../components/ShadowComponent';

export default class RenderSystem extends EngineRenderSystem {
    protected drawBeforeSprite(
        ctx: CanvasRenderingContext2D,
        entity: Entity,
        sprite: SpriteComponent,
        transform: TransformComponent,
    ) {
        const height = sprite.height * transform.scale.y;

        if (entity.hasComponent(ShadowComponent)) {
            const shadow = entity.getComponent(ShadowComponent);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(
                transform.position.x + shadow.offsetX,
                // Shadows are anchored at the sprite's bottom edge
                transform.position.y - height / 2 + shadow.offsetY,
                shadow.width / 2,
                shadow.height / 2,
                0,
                0,
                2 * Math.PI,
            );
            ctx.fill();
        }

        if (entity.hasComponent(HighlightComponent)) {
            const highlight = entity.getComponent(HighlightComponent);

            if (highlight.isHighlighted) {
                ctx.strokeStyle = 'rgb(255, 0, 0)';
                ctx.beginPath();
                ctx.ellipse(
                    transform.position.x + highlight.offsetX,
                    // Highlights are anchored at the sprite's bottom edge
                    transform.position.y - height / 2 + highlight.offsetY,
                    highlight.width / 2,
                    highlight.height / 2,
                    0,
                    0,
                    2 * Math.PI,
                );
                ctx.stroke();
            }
        }
    }
}
