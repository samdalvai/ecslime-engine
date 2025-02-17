import BoxColliderComponent from '../components/BoxColliderComponent';
import LifetimeComponent from '../components/LifetimeComponent';
import ParticleEmitComponent from '../components/ParticleEmitComponent';
import ProjectileComponent from '../components/ProjectileComponent';
import ProjectileEmitterComponent from '../components/ProjectileEmitterComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import ShadowComponent from '../components/ShadowComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import EventBus from '../event-bus/EventBus';
import KeyPressedEvent from '../events/KeyPressedEvent';
import { Entity } from '../types';

export default class ProjectileEmitSystem extends System {
    registry: Registry;

    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(ProjectileEmitterComponent);
        this.requireComponent(TransformComponent);
        this.registry = registry;
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(KeyPressedEvent, this, this.onKeyPressed);
    }

    onKeyPressed(event: KeyPressedEvent) {
        if (event.keyCode === 'Space') {
            const player = this.registry.getEntityByTag('player');

            if (!player) {
                throw new Error('Could not find entity with tag "Player"');
            }
            const projectileEmitter = this.registry.getComponent(player, ProjectileEmitterComponent);
            const transform = this.registry.getComponent(player, TransformComponent);

            if (!projectileEmitter || !transform) {
                throw new Error('Could not find some component(s) of entity with id ' + player);
            }

            this.emitProjectile(projectileEmitter, transform, player, this.registry);
        }
    }

    update(registry: Registry) {
        for (const entity of this.getSystemEntities()) {
            const projectileEmitter = this.registry.getComponent(entity, ProjectileEmitterComponent);
            const transform = this.registry.getComponent(entity, TransformComponent);

            if (!projectileEmitter || !transform) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            // If entity is player, skip automatic emission
            if (this.registry.entityHasTag(entity, 'player')) {
                continue;
            }

            this.emitProjectile(projectileEmitter, transform, entity, registry);
        }
    }

    private emitProjectile(
        projectileEmitter: ProjectileEmitterComponent,
        transform: TransformComponent,
        entity: Entity,
        registry: Registry,
    ) {
        // Check if its time to re-emit a new projectile
        if (performance.now() - projectileEmitter.lastEmissionTime > projectileEmitter.repeatFrequency) {
            // Modify the direction of the projectile according to the rigid body direction
            const projectileVelocity = { ...projectileEmitter.projectileVelocity };

            if (this.registry.hasComponent(entity, RigidBodyComponent)) {
                const rigidBody = this.registry.getComponent(entity, RigidBodyComponent);

                if (!rigidBody) {
                    throw new Error('Could not find some component(s) of entity with id ' + entity);
                }

                let directionX = 0;
                let directionY = 0;

                if (rigidBody.direction.x > 0) directionX = +1;
                if (rigidBody.direction.x < 0) directionX = -1;
                if (rigidBody.direction.y > 0) directionY = +1;
                if (rigidBody.direction.y < 0) directionY = -1;
                projectileVelocity.x = projectileEmitter.projectileVelocity.x * directionX + rigidBody.velocity.x;
                projectileVelocity.y = projectileEmitter.projectileVelocity.y * directionY + rigidBody.velocity.y;
            }

            const projectilePosition = { x: transform.position.x - 16, y: transform.position.y - 16 };

            if (this.registry.hasComponent(entity, SpriteComponent)) {
                const sprite = this.registry.getComponent(entity, SpriteComponent);

                if (!sprite) {
                    throw new Error('Could not find some component(s) of entity with id ' + entity);
                }

                projectilePosition.x += (sprite.width / 2) * transform.scale.x;
                projectilePosition.y += (sprite.height / 2) * transform.scale.y;
            }

            // Add a new projectile entity to the registry
            const projectile = registry.createEntity();
            this.registry.groupEntity(projectile, 'projectiles');
            this.registry.addComponent(projectile, TransformComponent, projectilePosition, { x: 1.0, y: 1.0 }, 0.0);
            this.registry.addComponent(projectile, RigidBodyComponent, projectileVelocity);
            this.registry.addComponent(projectile, SpriteComponent, 'magic-sphere-texture', 32, 32, 4);
            this.registry.addComponent(projectile, BoxColliderComponent, 8, 8, { x: 12, y: 12 });
            this.registry.addComponent(
                projectile,
                ProjectileComponent,
                projectileEmitter.isFriendly,
                projectileEmitter.hitPercentDamage,
            );
            this.registry.addComponent(projectile, LifetimeComponent, projectileEmitter.projectileDuration);
            this.registry.addComponent(
                projectile,
                ParticleEmitComponent,
                2,
                300,
                'rgba(255,255,255,0.5)',
                100,
                5,
                16,
                16,
            );
            this.registry.addComponent(projectile, ShadowComponent, 8, 4);

            // Update the projectile emitter component last emission to the current milliseconds
            projectileEmitter.lastEmissionTime = performance.now();
        }
    }
}
