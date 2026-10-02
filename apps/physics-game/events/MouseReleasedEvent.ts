import { GameEvent, MouseButton, Vector } from 'ecslime-engine';

export default class MouseReleasedEvent extends GameEvent {
    coordinates: Vector;
    button: MouseButton;

    constructor(coordinates: Vector, button: MouseButton) {
        super();
        this.coordinates = coordinates;
        this.button = button;
    }
}
