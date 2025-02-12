import Component from '../ecs/Component';

export default class ShadingComponent extends Component {
    offsetX: number;
    offsetY: number;

    constructor(offsetX = 0, offsetY = 0) {
        super();
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
}
