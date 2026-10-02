import { GameEvent, Vector } from 'ecslime-engine';

export default class RangedAttackEmitEvent extends GameEvent {
    coordinates: Vector;

    constructor(coordinates: Vector) {
        super();
        this.coordinates = coordinates;
    }
}
