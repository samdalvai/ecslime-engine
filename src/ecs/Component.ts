export type ComponentClass<T extends Component = Component, Args extends unknown[] = any[]> = {
    new (...args: Args): T;
    getComponentId(): number;
};

export class IComponent {
    private static nextId = 0;

    static resetIds(): void {
        IComponent.nextId = 0;
    }

    protected static getNextId(): number {
        return IComponent.nextId++;
    }
}

export default class Component extends IComponent {
    private static _id?: number;

    static getComponentId() {
        if (this._id === undefined) {
            this._id = this.getNextId();
        }
        return this._id;
    }
}
