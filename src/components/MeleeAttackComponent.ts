import Component from '../ecs/Component';

/**
 * Gives entity the ability to emit a melee attack
 */
export default class MeleeAttackComponent extends Component {
    isFriendly: boolean;
    hitPercentDamage: number;
    cooldown: number;
    lastEmissionTime: number;

    constructor(isFriendly = false, hitPercentDamage = 0, cooldown = 0) {
        super();
        this.isFriendly = isFriendly;
        this.hitPercentDamage = hitPercentDamage;
        this.cooldown = cooldown;
        this.lastEmissionTime = 0;
    }
}
