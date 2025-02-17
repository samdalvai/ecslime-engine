import GameEvent from '../event-bus/GameEvent';
import { Entity } from '../types';

export default class EntityKilledEvent extends GameEvent {
    entity: Entity;

    constructor(entity: Entity) {
        super();
        this.entity = entity;
    }
}
