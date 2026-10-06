import { Entity, GameEvent } from 'ecslime-engine';

export default class EntitySelectEvent extends GameEvent {
    entities: Entity[];

    constructor(entities: Entity[]) {
        super();
        this.entities = entities;
    }
}
