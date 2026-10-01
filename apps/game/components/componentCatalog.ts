import * as Components from '.';
import { Component, ComponentClass, createComponentCatalog } from '../../../src';

export const gameComponentCatalog = createComponentCatalog(
    Object.entries(Components).map(([name, ComponentConstructor]) => ({
        name,
        constructor: ComponentConstructor as ComponentClass<Component>,
    })),
);
