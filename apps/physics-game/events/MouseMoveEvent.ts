import { GameEvent, Vector } from 'ecslime-engine';

export default class MouseMoveEvent extends GameEvent {
    coordinates: Vector;

    constructor(coordinates: Vector) {
        super();
        this.coordinates = coordinates;
    }
}
