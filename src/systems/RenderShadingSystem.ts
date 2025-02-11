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
            console.log(entity.getId());
        }
    };
}
