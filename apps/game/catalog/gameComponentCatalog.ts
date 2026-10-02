import * as Components from '../components';
import { Component, ComponentClass, createComponentCatalog } from 'ecslime-engine';

export const gameComponentCatalog = createComponentCatalog(
    Object.entries(Components).map(([name, ComponentConstructor]) => ({
        name,
        constructor: ComponentConstructor as ComponentClass<Component>,
    })),
);
