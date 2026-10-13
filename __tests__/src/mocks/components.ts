import { Component, Vector } from '../../../src';

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

type Plain = {
    value1: number;
    value2: number;
};

type NestedObject = {
    nested: Plain;
    plain: number;
};

export class MockNestedComponent extends Component {
    object: NestedObject;

    constructor(object: NestedObject = { nested: { value1: 0, value2: 0 }, plain: 0 }) {
        super();
        this.object = object;
    }
}

export class MockMetadataComponent extends Component {
    value1: number = 0;
    value2: number = 0;

    constructor(value1 = 0, value2 = 0) {
        super();
        this.value1 = value1;
        this.value2 = value2;
    }
}

export enum MockStringEnum {
    FIRST = 'first',
    SECOND = 'second',
}

export enum MockNumericEnum {
    ZERO,
    ONE,
    TWO,
}

export class MockEnumComponent extends Component {
    stringValue: MockStringEnum;
    numericValue: MockNumericEnum;
    position: Vector;

    constructor(
        stringValue = MockStringEnum.FIRST,
        numericValue = MockNumericEnum.ZERO,
        position: Vector = { x: 0, y: 0 },
    ) {
        super();
        this.stringValue = stringValue;
        this.numericValue = numericValue;
        this.position = position;
    }
}

export type MockState = 'idle' | 'run';

export class MockStateComponent extends Component {
    state: MockState;

    constructor(state: MockState = 'idle') {
        super();
        this.state = state;
    }
}
