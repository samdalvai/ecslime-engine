import { GameEvent, Vector } from '../../../src';

export default class MouseMoveEvent extends GameEvent {
    coordinates: Vector;

    constructor(coordinates: Vector) {
        super();
        this.coordinates = coordinates;
    }
}
