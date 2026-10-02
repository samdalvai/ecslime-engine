import { Vector } from '../types/utils';

export type PhysicsShape =
    | { kind: 'box'; width: number; height: number }
    | { kind: 'circle'; radius: number }
    | { kind: 'capsule'; halfHeight: number; radius: number }
    | { kind: 'polygon'; vertices: readonly Vector[] }
    | { kind: 'segment'; length: number; horizontal: boolean };

type BodyMass = { mass: number; density?: never } | { density: number; mass?: never };

/** Plain data accepted by PhysicsBridge; no gravity.js types are needed by apps. */
export type PhysicsBodyOptions = BodyMass & {
    shape: PhysicsShape;
    /** Radians, matching the physics simulation. */
    rotation?: number;
    velocity?: Vector;
    angularVelocity?: number;
    canRotate?: boolean;
    isBullet?: boolean;
    restitution?: number;
    friction?: number;
    rollingResistance?: number;
    surfaceSpeed?: number;
    charge?: number;
    temperature?: number;
    gravityScale?: number;
    /** Collision filter bit fields. */
    collisionCategory?: number;
    collisionMask?: number;
};
