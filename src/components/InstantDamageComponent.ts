import Component from '../ecs/Component';

export default class InstantDamageComponent extends Component {
    hitPercentDamage: number;
    isFriendly: boolean;

    constructor(hitPercentDamage = 0, isFriendly = false) {
        super();
        this.hitPercentDamage = hitPercentDamage;
        this.isFriendly = isFriendly;
    }
}
