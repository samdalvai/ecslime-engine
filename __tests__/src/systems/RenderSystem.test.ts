import { beforeEach, describe, expect, test } from '@jest/globals';

import Engine from '../../../src/Engine';
import AssetStore from '../../../src/asset-store/AssetStore';
import SpriteComponent from '../../../src/components/SpriteComponent';
import TransformComponent from '../../../src/components/TransformComponent';
import { IComponent } from '../../../src/ecs/Component';
import Entity from '../../../src/ecs/Entity';
import Registry from '../../../src/ecs/Registry';
import { ISystem } from '../../../src/ecs/System';
import RenderSystem from '../../../src/systems/RenderSystem';
import { Camera, Vector } from '../../../src/types/utils';

// World bounds: x 0..200, y 0..150
const camera: Camera = { center: { x: 100, y: 75 }, viewportWidth: 200, viewportHeight: 150 };

const createContext = (calls: string[]) =>
    new Proxy(
        {},
        {
            get: (_target, property) =>
                property === 'drawImage' ? (texture: string) => calls.push(texture) : () => {},
            set: () => true,
        },
    ) as unknown as CanvasRenderingContext2D;

// Textures are identified by their asset id, so drawImage calls record which entity was drawn
const assetStore = { getTexture: (assetId: string) => assetId } as unknown as AssetStore;

class HookRenderSystem extends RenderSystem {
    calls: string[] = [];

    protected drawBeforeSprite(_ctx: CanvasRenderingContext2D, _entity: Entity, sprite: SpriteComponent) {
        this.calls.push(`before:${sprite.assetId}`);
    }
}

describe('RenderSystem', () => {
    let registry: Registry;

    const addSprite = (assetId: string, position: Vector, zIndex = 0, options: Partial<SpriteComponent> = {}) => {
        const entity = registry.createEntity();
        entity.addComponent(TransformComponent, position);
        const sprite = entity.addComponent(SpriteComponent, assetId, 10, 10, zIndex);
        Object.assign(sprite, options);
        return entity;
    };

    const render = () => {
        const calls: string[] = [];
        registry.addSystem(RenderSystem);
        registry.update();
        registry.getSystem(RenderSystem).update(createContext(calls), assetStore, camera);
        return calls;
    };

    beforeEach(() => {
        IComponent.resetIds();
        ISystem.resetIds();
        Engine.mapWidth = 1000;
        Engine.mapHeight = 1000;
        registry = new Registry();
    });

    test('Should draw by zIndex, then entities lower in the world last', () => {
        addSprite('top', { x: 50, y: 100 });
        addSprite('bottom', { x: 50, y: 20 });
        addSprite('foreground', { x: 50, y: 140 }, 1);

        expect(render()).toEqual(['top', 'bottom', 'foreground']);
    });

    test('Should cull entities outside the camera, but not fixed entities', () => {
        addSprite('visible', { x: 50, y: 50 });
        addSprite('outside', { x: 500, y: 500 });
        const fixed = registry.createEntity();
        fixed.addComponent(TransformComponent, { x: 500, y: 500 }, { x: 1, y: 1 }, 0, true);
        fixed.addComponent(SpriteComponent, 'fixed', 10, 10);

        expect(render().sort()).toEqual(['fixed', 'visible']);
    });

    test('Should cull entities outside the map, except in the editor', () => {
        Engine.mapWidth = 100;
        addSprite('off-map', { x: 150, y: 50 });

        expect(render()).toEqual([]);

        const calls: string[] = [];
        registry.getSystem(RenderSystem).update(createContext(calls), assetStore, camera, true);
        expect(calls).toEqual(['off-map']);
    });

    test('Should not draw invisible sprites', () => {
        addSprite('hidden', { x: 50, y: 50 }, 0, { isVisible: false });

        expect(render()).toEqual([]);
    });

    test('Should call drawBeforeSprite right before each sprite is drawn', () => {
        addSprite('a', { x: 50, y: 100 });
        addSprite('b', { x: 50, y: 20 });
        addSprite('hidden', { x: 50, y: 50 }, 0, { isVisible: false });

        registry.addSystem(HookRenderSystem);
        registry.update();
        const system = registry.getSystem(HookRenderSystem);
        system.update(createContext(system.calls), assetStore, camera);

        expect(system.calls).toEqual(['before:a', 'a', 'before:b', 'b']);
    });
});
