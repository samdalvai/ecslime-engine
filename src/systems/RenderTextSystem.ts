import TextLabelComponent from '../components/TextLabelComponent';
import System from '../ecs/System';
import { Rectangle } from '../types';

export default class RenderTextSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(TextLabelComponent);
    }

    update(ctx: CanvasRenderingContext2D, camera: Rectangle) {
        for (const entity of this.getSystemEntities()) {
            const textlabel = this.registry.getComponent(entity, TextLabelComponent);

            if (!textlabel) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            ctx.fillStyle = `rgb(${textlabel.color.r},${textlabel.color.g},${textlabel.color.b})`;
            ctx.font = textlabel.font;

            const textX = textlabel.position.x - (textlabel.isFixed ? 0 : camera.x);
            const textY = textlabel.position.y - (textlabel.isFixed ? 0 : camera.y);

            ctx.fillText(textlabel.text, textX, textY);
        }
    }
}
