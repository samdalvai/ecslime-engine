import AssetStore from '../asset-store/AssetStore';
import AnimationComponent from '../components/AnimationComponent';
import BoxColliderComponent from '../components/BoxColliderComponent';
import CameraFollowComponent from '../components/CameraFollowComponent';
import CameraShakeComponent from '../components/CameraShakeComponent';
import DeadBodyOnDeathComponent from '../components/DeadBodyOnDeathComponent';
import EntityFollowComponent from '../components/EntityFollowComponent';
import HealthComponent from '../components/HealthComponent';
import KeyboardControlComponent from '../components/KeyboardControlComponent';
import LightEmitComponent from '../components/LightEmitComponent';
import ParticleEmitComponent from '../components/ParticleEmitComponent';
import ProjectileEmitterComponent from '../components/ProjectileEmitterComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import ScriptComponent from '../components/ScriptComponent';
import ShadowComponent from '../components/ShadowComponent';
import SpriteComponent from '../components/SpriteComponent';
import SpriteDirectionComponent from '../components/SpriteDirectionComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import { TileMap } from '../types';
import Game from './Game';

export default class LevelLoader {
    public static async loadLevel(registry: Registry, assetStore: AssetStore) {
        await this.loadAssets(assetStore);
        this.loadTileMap(registry, assetStore);
        this.loadEntities(registry);
    }

    private static async loadAssets(assetStore: AssetStore) {
        console.log('Loading assets');
        await assetStore.addJson('tile-map', '/assets/tilemaps/tilemap.json');
        await assetStore.addTexture('desert-texture', './assets/tilemaps/desert.png');
        await assetStore.addTexture('tiles-dark-texture', './assets/tilemaps/tiles_dark.png');

        await assetStore.addTexture('slime-texture', './assets/images/slime_big_full.png');
        await assetStore.addTexture('player-texture', './assets/images/player_full.png');
        await assetStore.addTexture('magic-sphere-texture', './assets/images/magic_sphere.png');

        await assetStore.addTexture('tree-texture', './assets/images/tree.png');
        await assetStore.addTexture('torch-texture', './assets/images/torch.png');
    }

    private static loadTileMap(registry: Registry, assetStore: AssetStore) {
        console.log('Loading tilemap');
        const tileMap = assetStore.getJson('tile-map') as TileMap;

        const tileSize = 32;
        const mapScale = 2;
        let rowNumber = 0;
        let columnNumber = 0;
        for (let i = 0; i < tileMap.tiles.length; i++) {
            columnNumber = 0;
            for (let j = 0; j < tileMap.tiles[i].length; j++) {
                const tileNumber = tileMap.tiles[i][j];
                const srcRectX = (tileNumber % 10) * tileSize;
                const srcRectY = Math.floor(tileNumber / 10) * tileSize;
                const tile = registry.createEntity();
                registry.addComponent(
                    tile,
                    TransformComponent,
                    {
                        x: columnNumber * (mapScale * tileSize),
                        y: rowNumber * (mapScale * tileSize),
                    },
                    { x: mapScale, y: mapScale },
                    0,
                );
                registry.addComponent(
                    tile,
                    SpriteComponent,
                    'tiles-dark-texture',
                    tileSize,
                    tileSize,
                    0,
                    srcRectX,
                    srcRectY,
                );
                columnNumber++;
            }
            rowNumber++;
        }
        Game.mapWidth = columnNumber * tileSize * mapScale;
        Game.mapHeight = rowNumber * tileSize * mapScale;
    }

    private static loadEntities(registry: Registry) {
        console.log('Loading entities');
        const player = registry.createEntity();
        registry.addComponent(player, TransformComponent, { x: 240, y: 100 }, { x: 1, y: 1 }, 0);
        registry.addComponent(player, SpriteComponent, 'player-texture', 32, 32, 1, 0, 0);
        registry.addComponent(player, DeadBodyOnDeathComponent);
        registry.addComponent(player, SpriteDirectionComponent);
        registry.addComponent(player, ShadowComponent, 30, 10, 0, -2);
        registry.addComponent(player, AnimationComponent, 4, 6);
        registry.addComponent(player, RigidBodyComponent, { x: 0, y: 0 }, { x: 1, y: 0 });
        registry.addComponent(player, CameraFollowComponent);
        registry.addComponent(player, KeyboardControlComponent, -200, 200, 200, -200);
        registry.addComponent(player, ProjectileEmitterComponent, { x: 200, y: 200 }, 250, 3000, 10, true);
        registry.addComponent(player, BoxColliderComponent, 25, 34, { x: 2.5, y: 0 });
        registry.addComponent(player, HealthComponent, 100);
        registry.addComponent(player, CameraShakeComponent, 100);
        registry.addComponent(player, LightEmitComponent, 250);
        registry.tagEntity(player, 'player');

        const enemy = registry.createEntity();
        registry.addComponent(enemy, TransformComponent, { x: 300, y: 600 }, { x: 1, y: 1 }, 0);
        registry.addComponent(enemy, SpriteComponent, 'slime-texture', 32, 32, 1, 0, 0);
        registry.addComponent(enemy, SpriteDirectionComponent);
        registry.addComponent(enemy, DeadBodyOnDeathComponent);
        registry.addComponent(enemy, ShadowComponent, 30, 10, 0, -8);
        registry.addComponent(enemy, AnimationComponent, 2, 4);
        registry.addComponent(enemy, RigidBodyComponent, { x: 50, y: 0 }, { x: 1, y: 0 });
        registry.addComponent(enemy, BoxColliderComponent, 25, 20, { x: 4, y: 7 });
        registry.addComponent(enemy, HealthComponent, 50);
        registry.addComponent(enemy, ProjectileEmitterComponent, { x: 100, y: 100 }, 500, 2000, 20, false);
        registry.addComponent(enemy, EntityFollowComponent, 250, 100, 50, { x: 16, y: 16 }, 5000);
        registry.addComponent(enemy, ScriptComponent, [
            { movement: { x: 50, y: 0 }, duration: 2000 },
            { movement: { x: 0, y: 50 }, duration: 2000 },
            { movement: { x: -50, y: 0 }, duration: 2000 },
            { movement: { x: 0, y: -50 }, duration: 2000 },
        ]);
        registry.groupEntity(enemy, 'enemies');

        const torch = registry.createEntity();
        registry.addComponent(torch, SpriteComponent, 'torch-texture', 32, 32, 1);
        registry.addComponent(torch, TransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 });
        registry.addComponent(torch, AnimationComponent, 4, 10);
        registry.addComponent(torch, LightEmitComponent, 100);
        registry.addComponent(torch, ShadowComponent, 10, 5, -0.5, -5);
        registry.addComponent(torch, ParticleEmitComponent, 2, 1000, 'rgba(255,0,0,1)', 200, 5, 16, 0, {
            x: 0,
            y: -50,
        });

        const torch2 = registry.createEntity();
        registry.addComponent(torch2, SpriteComponent, 'torch-texture', 32, 32, 1);
        registry.addComponent(torch2, TransformComponent, { x: 500, y: 200 }, { x: 1, y: 1 });
        registry.addComponent(torch2, AnimationComponent, 4, 10);
        registry.addComponent(torch2, LightEmitComponent, 100);
        registry.addComponent(torch2, ShadowComponent, 10, 5, -0.5, -5);
        registry.addComponent(torch2, ParticleEmitComponent, 2, 1000, 'rgba(255,0,0,1)', 200, 5, 16, 0, {
            x: 0,
            y: -50,
        });
    }
}
