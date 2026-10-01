import { GameEvent } from '../../../src';

export default class ScrollEvent extends GameEvent {
    direction: 'up' | 'down';

    constructor(direction: 'up' | 'down') {
        super();
        this.direction = direction;
    }
}
