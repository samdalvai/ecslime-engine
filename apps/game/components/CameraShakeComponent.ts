import { Component } from '../../../src';

export default class CameraShakeComponent extends Component {
    shakeDuration: number;

    constructor(shakeDuration = 0) {
        super();
        this.shakeDuration = shakeDuration;
    }
}
