import Component, { ComponentClass } from '../ecs/Component';

type AnyComponentClass = ComponentClass<Component>;

type ComponentClassRecord = Record<string, ComponentClass<any>>;

/** Instance keys of a component that hold data, methods are excluded */
export type ComponentDataKeys<T> = {
    [K in keyof T]-?: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

export type PropertyMetadata = {
    /** Defaults to true, when false the property is omitted from the serialized output */
    serialize?: boolean;
    /** Defaults to true, when false the serialized value is ignored and the constructor default is kept */
    deserialize?: boolean;
};

export type ComponentMetadata<T extends Component> = {
    properties?: { [K in ComponentDataKeys<T>]?: PropertyMetadata };
};

/** Optional metadata for each component of a catalog, keyed by component name */
export type CatalogMetadata<C extends ComponentClassRecord> = {
    [K in keyof C]?: ComponentMetadata<InstanceType<C[K]>>;
};

export type ComponentDefinition = {
    name: string;
    constructor: AnyComponentClass;
    metadata?: ComponentMetadata<any>;
};

export type ComponentCatalog = {
    get(name: string): ComponentDefinition | undefined;
    getByConstructor(component: Component | AnyComponentClass): ComponentDefinition | undefined;
    list(): ComponentDefinition[];
};

export const createComponentCatalog = <C extends ComponentClassRecord>(
    components: C,
    metadata: CatalogMetadata<C> = {},
): ComponentCatalog => {
    const definitions: ComponentDefinition[] = [];
    const definitionsByName = new Map<string, ComponentDefinition>();
    const definitionsByConstructor = new Map<AnyComponentClass, ComponentDefinition>();

    for (const [name, constructor] of Object.entries(components)) {
        if (definitionsByConstructor.has(constructor)) {
            throw new Error(`Duplicate component definition constructor: ${name}`);
        }

        const definition: ComponentDefinition = { name, constructor, metadata: metadata[name] };

        definitions.push(definition);
        definitionsByName.set(name, definition);
        definitionsByConstructor.set(constructor, definition);
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
