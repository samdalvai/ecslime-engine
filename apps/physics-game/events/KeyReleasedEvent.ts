import { GameEvent } from 'ecslime-engine';

export default class KeyReleasedEvent extends GameEvent {
    keyCode: string;

    constructor(keyCode: string) {
        super();
        this.keyCode = keyCode;
    }
}
