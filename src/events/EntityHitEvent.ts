import GameEvent from '../event-bus/GameEvent';
import { Entity, Vector } from '../types';

export default class EntityHitEvent extends GameEvent {
    entity: Entity;
    hitPosition: Vector;

    constructor(entity: Entity, hitPosition: Vector) {
        super();
        this.hitPosition = hitPosition;
        this.entity = entity;
    }
}
