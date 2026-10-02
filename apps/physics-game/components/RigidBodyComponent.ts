import { Component, PhysicsBodyOptions } from 'ecslime-engine';

export default class RigidBodyComponent extends Component {
    // TODO: we need to check if these properties are serializable in a level
    options: PhysicsBodyOptions;

    constructor(options: PhysicsBodyOptions) {
        super();
        this.options = options;
    }
}
