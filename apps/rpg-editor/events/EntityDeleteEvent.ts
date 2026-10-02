import { Entity, GameEvent } from 'ecslime-engine';

export default class EntityDeleteEvent extends GameEvent {
    entity: Entity;

    constructor(entity: Entity) {
        super();
        this.entity = entity;
    }
}
