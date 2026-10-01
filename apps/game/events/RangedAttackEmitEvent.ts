import { GameEvent, Vector } from '../../../src';

export default class RangedAttackEmitEvent extends GameEvent {
    coordinates: Vector;

    constructor(coordinates: Vector) {
        super();
        this.coordinates = coordinates;
    }
}
