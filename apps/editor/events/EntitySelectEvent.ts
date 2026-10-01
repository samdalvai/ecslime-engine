import { Entity, GameEvent } from '../../../src';

export default class EntitySelectEvent extends GameEvent {
    entities: Entity[];

    constructor(entities: Entity[]) {
        super();
        this.entities = entities;
    }
}
