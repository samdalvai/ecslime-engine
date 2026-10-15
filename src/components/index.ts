import { CatalogMetadata, enumOptions } from '../serialization/componentCatalog';
import { Flip } from '../types/utils';
import SpriteComponent from './SpriteComponent';
import TransformComponent from './TransformComponent';

export { SpriteComponent, TransformComponent };

/** Components provided by the engine, to be merged into the component catalog of a game. */
export const DefaultComponents = { SpriteComponent, TransformComponent };

/** Catalog metadata of the default components, to be merged into the catalog metadata of a game. */
export const defaultComponentMetadata: CatalogMetadata<typeof DefaultComponents> = {
    SpriteComponent: { properties: { flip: { enum: enumOptions(Flip) } } },
};
