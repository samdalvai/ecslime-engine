import { Component, Vector } from 'ecslime-engine';

export default class RigidBodyComponent extends Component {
    mass: number;
    restitution: number;

    constructor(mass = 0, restitution = 0) {
        super();
        this.mass = mass;
        this.restitution = restitution;
    }
}
