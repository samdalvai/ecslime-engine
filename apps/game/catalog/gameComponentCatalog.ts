import { createComponentCatalog } from 'ecslime-engine';

import * as Components from '../components';

export const gameComponentCatalog = createComponentCatalog(Components, {
    AnimationComponent: { properties: { startTime: { serialize: false, deserialize: false } } },
    LifetimeComponent: { properties: { startTime: { serialize: false, deserialize: false } } },
    EntityFollowComponent: { properties: { followedEntity: { serialize: false, deserialize: false } } },
});
