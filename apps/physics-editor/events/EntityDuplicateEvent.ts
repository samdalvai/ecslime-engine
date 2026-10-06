import { Entity, GameEvent } from 'ecslime-engine';

export default class EntityDuplicateEvent extends GameEvent {
    entity: Entity;

    constructor(entity: Entity) {
        super();
        this.entity = entity;
    }
}
