import { Component, Vector } from '../../src';

/** Test-only components with predictable constructor parameters and serialized fields. */
export class MockTransformComponent extends Component {
    position: Vector;
    scale: Vector;
    rotation: number;
    isFixed: boolean;

    constructor(position: Vector = { x: 0, y: 0 }, scale: Vector = { x: 1, y: 1 }, rotation = 0, isFixed = false) {
        super();
        this.position = position;
        this.scale = scale;
        this.rotation = rotation;
        this.isFixed = isFixed;
    }
}

export class MockRigidBodyComponent extends Component {
    velocity: Vector;
    direction: Vector;

    constructor(velocity: Vector = { x: 0, y: 0 }, direction: Vector = { x: 0, y: 0 }) {
        super();
        this.velocity = velocity;
        this.direction = direction;
    }
}
