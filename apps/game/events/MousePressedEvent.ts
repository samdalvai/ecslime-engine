import { GameEvent, MouseButton, Vector } from '../../../src';

export default class MousePressedEvent extends GameEvent {
    coordinates: Vector;
    button: MouseButton;

    constructor(coordinates: Vector, button: MouseButton) {
        super();
        this.coordinates = coordinates;
        this.button = button;
    }
}
