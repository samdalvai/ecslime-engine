import Component, { ComponentClass } from './Component';
import Entity from './Entity';
import Signature from './Signature';

export type SystemClass<T extends System> = {
    new (...args: any[]): T;
    getSystemId(): number;
};

export class ISystem {
    static nextId = 0;

    static resetIds(): void {
        this.nextId = 0;
    }
}

export default class System extends ISystem {
    private static _id?: number;
    private componentSignature: Signature;
    private entities: Set<Entity>;

    constructor() {
        super();
        this.componentSignature = new Signature();
        this.entities = new Set();
    }

    static getSystemId() {
        if (this._id === undefined) {
            this._id = ISystem.nextId++;
        }
        return this._id;
    }

    addEntityToSystem = (entity: Entity) => {
        this.entities.add(entity);
    };

    removeEntityFromSystem = (entity: Entity) => {
        this.entities.delete(entity);
    };

    getSystemEntities = () => {
        return this.entities;
    };

    getComponentSignature = () => {
        return this.componentSignature;
    };

    requireComponent = <T extends Component>(ComponentClass: ComponentClass<T>) => {
        const componentId = ComponentClass.getComponentId();
        this.componentSignature.set(componentId);
    };

    removeAllEntities = () => {
        this.entities.clear();
    };
}
