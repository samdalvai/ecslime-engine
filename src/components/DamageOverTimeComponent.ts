import Component from '../ecs/Component';

export default class DamageOverTimeComponent extends Component {
    damagePerSecond: number;
    isFriendly: boolean;
    lastDamageTime: number;

    constructor(damagePerSecond = 0, isFriendly = false) {
        super();
        this.damagePerSecond = damagePerSecond;
        this.isFriendly = isFriendly;
        this.lastDamageTime = 0;
    }
}
