import { DefaultComponents, createComponentCatalog, defaultComponentMetadata, enumOptions } from 'ecslime-engine';

import * as Components from '../components';
import { PickupEffect } from '../components/PickableItemComponent';

export const gameComponentCatalog = createComponentCatalog(
    { ...DefaultComponents, ...Components },
    {
        ...defaultComponentMetadata,
        AnimationComponent: { properties: { startTime: { serialize: false, deserialize: false } } },
        LifetimeComponent: { properties: { startTime: { serialize: false, deserialize: false } } },
        EntityFollowComponent: { properties: { followedEntity: { serialize: false, deserialize: false } } },
        PickableItemComponent: { properties: { effectOnPickup: { enum: enumOptions(PickupEffect) } } },
    },
);
