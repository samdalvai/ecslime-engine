import { GameEvent } from '../../../src';

export default class SoundEmitEvent extends GameEvent {
    soundAssetId: string;
    volume: number;

    constructor(soundAssetId: '', volume = 1) {
        super();
        this.soundAssetId = soundAssetId;
        this.volume = volume;
    }
}
