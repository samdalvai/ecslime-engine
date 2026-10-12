import Component, { ComponentClass } from '../ecs/Component';

type AnyComponentClass = ComponentClass<Component>;

export type ComponentFieldDefinition = {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'vector' | 'rectangle' | 'enum' | 'json';
    options?: readonly string[];
};

// TODO: evaluate if all these methods should live here or be moved to component metadata, e.g. serialize and deserialize rules
// maybe it's better to keep them near the component if for example we need to avoid serializing or deserializing a property
export type ComponentDefinition<T extends Component = Component> = {
    name: string;
    constructor: ComponentClass<T>;
};

export type ComponentCatalog = {
    get(name: string): ComponentDefinition | undefined;
    getByConstructor(component: Component | AnyComponentClass): ComponentDefinition | undefined;
    list(): ComponentDefinition[];
};

export const createComponentCatalog = (definitions: ComponentDefinition<any>[]): ComponentCatalog => {
    const definitionsByName = new Map<string, ComponentDefinition>();
    const definitionsByConstructor = new Map<AnyComponentClass, ComponentDefinition>();

    for (const definition of definitions) {
        if (definitionsByName.has(definition.name)) {
            throw new Error(`Duplicate component definition name: ${definition.name}`);
        }

        if (definitionsByConstructor.has(definition.constructor)) {
            throw new Error(`Duplicate component definition constructor: ${definition.name}`);
        }

        definitionsByName.set(definition.name, definition);
        definitionsByConstructor.set(definition.constructor, definition);
    }

    return {
        get: (name: string) => definitionsByName.get(name),
        getByConstructor: (component: Component | AnyComponentClass) => {
            const ComponentConstructor =
                typeof component === 'function'
                    ? (component as AnyComponentClass)
                    : (component.constructor as AnyComponentClass);

            return definitionsByConstructor.get(ComponentConstructor);
        },
        list: () => [...definitions],
    };
};
