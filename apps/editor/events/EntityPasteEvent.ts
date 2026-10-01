import { EntityMap, GameEvent } from '../../../src';

export default class EntityPasteEvent extends GameEvent {
    entities: EntityMap[];

    constructor(entities: EntityMap[]) {
        super();
        this.entities = entities;
    }
}
