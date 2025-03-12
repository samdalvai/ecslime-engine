import AssetStore from '../../asset-store/AssetStore';
import System from '../../ecs/System';
import Game from '../../game/Game';

export default class RenderGUISystem extends System {
    constructor() {
        super();
    }

    update(ctx: CanvasRenderingContext2D, assetStore: AssetStore) {
        const padding = 25;

        const skillsMenuScale = 2.0;
        const skillsMenuWidth = 32 * 3;
        const skillsMenuHeight = 32;

        ctx.drawImage(
            assetStore.getTexture('skills-menu-texture'),
            0,
            0,
            skillsMenuWidth,
            skillsMenuHeight,
            padding,
            Game.windowHeight - 64 - padding,
            skillsMenuWidth * skillsMenuScale,
            skillsMenuHeight * skillsMenuScale,
        );

        const magicBubbleScale = 0.5;
        const magicBubbleWidth = 128;
        const magicBubbleHeight = 128;

        ctx.drawImage(
            assetStore.getTexture('magic-bubble-texture'),
            128,
            0,
            magicBubbleWidth,
            magicBubbleHeight,
            padding,
            Game.windowHeight - 64 - padding,
            magicBubbleWidth * magicBubbleScale,
            magicBubbleWidth * magicBubbleScale,
        );

        const fireBallScale = 1.5;
        const fireBallWidth = 32;
        const fireBallHeight = 32;

        ctx.drawImage(
            assetStore.getTexture('fireball-texture'),
            0,
            32,
            fireBallWidth,
            fireBallHeight,
            padding + magicBubbleWidth * magicBubbleScale + 6,
            Game.windowHeight - 64 - padding + 6,
            fireBallWidth * fireBallScale,
            fireBallWidth * fireBallScale,
        );

        const mouseMenuScale = 2.0;
        const mouseMenuWidth = 32 * 1;
        const mouseMenuHeight = 32;

        ctx.drawImage(
            assetStore.getTexture('mouse-menu-texture'),
            0,
            0,
            mouseMenuWidth,
            mouseMenuHeight,
            2 * padding + skillsMenuWidth * skillsMenuScale,
            Game.windowHeight - 64 - padding,
            mouseMenuWidth * mouseMenuScale,
            mouseMenuHeight * mouseMenuScale,
        );

        const magicSphereScale = 2;
        const magicSphereWidth = 32;
        const magicSphereHeight = 32;

        ctx.drawImage(
            assetStore.getTexture('magic-sphere-texture'),
            0,
            0,
            magicSphereWidth,
            magicSphereHeight,
            2 * padding + skillsMenuWidth * skillsMenuScale,
            Game.windowHeight - 64 - padding,
            magicSphereWidth * magicSphereScale,
            magicSphereWidth * magicSphereScale,
        );
    }
}
