import { Component, PhysicsBodyOptions } from 'ecslime-engine';

export default class RigidBodyComponent extends Component {
    options: PhysicsBodyOptions;

    constructor(options?: PhysicsBodyOptions) {
        super();
        this.options = options ?? { shape: { kind: 'box', width: 32, height: 32 }, mass: 1 };
    }
}
