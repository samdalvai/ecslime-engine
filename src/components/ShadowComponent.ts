import Component from '../ecs/Component';

export default class ShadowComponent extends Component {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    cachedShadow: HTMLCanvasElement | null;

    constructor(width = 0, height = 0, offsetX = 0, offsetY = 0) {
        super();
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cachedShadow = null;
    }
}
