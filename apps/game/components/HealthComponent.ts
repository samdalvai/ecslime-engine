import { Component } from '../../../src';

export default class HealthComponent extends Component {
    healthPercentage: number;
    lastDamageTime: number;

    constructor(healthPercentage = 0) {
        super();
        this.healthPercentage = healthPercentage;
        this.lastDamageTime = 0;
    }
}
