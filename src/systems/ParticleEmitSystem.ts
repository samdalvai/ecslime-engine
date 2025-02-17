import LifetimeComponent from '../components/LifetimeComponent';
import ParticleComponent from '../components/ParticleComponent';
import ParticleEmitComponent from '../components/ParticleEmitComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import { Vector } from '../types';

export default class ParticleEmitSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(ParticleEmitComponent);
        this.requireComponent(TransformComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const particleEmit = this.registry.getComponent(entity, ParticleEmitComponent);
            const transform = this.registry.getComponent(entity, TransformComponent);

            if (!particleEmit || !transform) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            const particlePosition = this.getRandomPointInCircle(
                transform.position.x + particleEmit.offsetX,
                transform.position.y + particleEmit.offsetY,
                particleEmit.emitRadius,
            );

            if (performance.now() - particleEmit.lastEmission < particleEmit.emitFrequency) {
                continue;
            }

            const particle = this.registry.createEntity();
            this.registry.addComponent(particle, ParticleComponent, particleEmit.dimension, particleEmit.color);
            this.registry.addComponent(particle, TransformComponent, particlePosition);
            this.registry.addComponent(particle, LifetimeComponent, particleEmit.duration);
            this.registry.addComponent(particle, RigidBodyComponent, { ...particleEmit.particleVelocity });

            particleEmit.lastEmission = performance.now();
        }
    }

    private getRandomPointInCircle = (cx: number, cy: number, r: number): Vector => {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * r;

        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        return { x, y };
    };
}
