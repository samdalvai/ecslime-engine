import { Entity, GameEvent } from '../../../src';

export default class EntityKilledEvent extends GameEvent {
    entity: Entity;

    constructor(entity: Entity) {
        super();
        this.entity = entity;
    }
}
