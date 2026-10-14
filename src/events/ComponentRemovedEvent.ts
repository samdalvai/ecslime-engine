import { ComponentClass } from '../ecs/Component';
import Entity from '../ecs/Entity';
import GameEvent from '../event-bus/GameEvent';

export default class ComponentRemovedEvent extends GameEvent {
    entity: Entity;
    componentClass: ComponentClass;

    constructor(entity: Entity, componentClass: ComponentClass) {
        super();
        this.entity = entity;
        this.componentClass = componentClass;
    }
}
