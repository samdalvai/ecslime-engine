import { GameEvent } from 'ecslime-engine';

export default class KeyPressedEvent extends GameEvent {
    keyCode: string;

    constructor(keyCode: string) {
        super();
        this.keyCode = keyCode;
    }
}
