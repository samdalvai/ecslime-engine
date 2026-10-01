import { GameEvent } from '../../../src';

export default class KeyPressedEvent extends GameEvent {
    keyCode: string;

    constructor(keyCode: string) {
        super();
        this.keyCode = keyCode;
    }
}
