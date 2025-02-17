import BoxColliderComponent from '../components/BoxColliderComponent';
import CameraShakeComponent from '../components/CameraShakeComponent';
import HealthComponent from '../components/HealthComponent';
import ProjectileComponent from '../components/ProjectileComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import EventBus from '../event-bus/EventBus';
import CameraShakeEvent from '../events/CameraShakeEvent';
import CollisionEvent from '../events/CollisionEvent';
import EntityHitEvent from '../events/EntityHitEvent';
import EntityKilledEvent from '../events/EntityKilledEvent';
import { Entity } from '../types';

export default class DamageSystem extends System {
    eventBus: EventBus;

    constructor(eventBus: EventBus, registry: Registry) {
        super(registry);
        this.eventBus = eventBus;
        this.requireComponent(BoxColliderComponent);
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(CollisionEvent, this, this.onCollision);
    }

    onCollision(event: CollisionEvent) {
        const a = event.a;
        const b = event.b;

        if (this.registry.entityBelongsToGroup(a, 'projectiles') && this.registry.entityHasTag(b, 'player')) {
            this.onProjectileHitsPlayer(a, b);
        }

        if (this.registry.entityBelongsToGroup(b, 'projectiles') && this.registry.entityHasTag(a, 'player')) {
            this.onProjectileHitsPlayer(b, a);
        }

        if (this.registry.entityBelongsToGroup(a, 'projectiles') && this.registry.entityBelongsToGroup(b, 'enemies')) {
            this.onProjectileHitsEnemy(a, b);
        }

        if (this.registry.entityBelongsToGroup(b, 'projectiles') && this.registry.entityBelongsToGroup(a, 'enemies')) {
            this.onProjectileHitsEnemy(b, a);
        }
    }

    onProjectileHitsPlayer(projectile: Entity, player: Entity) {
        const projectileComponent = this.registry.getComponent(projectile, ProjectileComponent);

        if (!projectileComponent) {
            throw new Error('Could not find some component(s) of entity with id ' + projectile);
        }

        if (!projectileComponent.isFriendly && this.registry.hasComponent(player, HealthComponent)) {
            const health = this.registry.getComponent(player, HealthComponent);

            if (!health) {
                throw new Error('Could not find some component(s) of entity with id ' + player);
            }

            health.healthPercentage -= projectileComponent.hitPercentDamage;
            health.lastDamageTime = performance.now();

            if (health.healthPercentage <= 0) {
                this.eventBus.emitEvent(EntityKilledEvent, player);

                this.registry.killEntity(player);
            }

            this.registry.killEntity(projectile);

            if (this.registry.hasComponent(player, CameraShakeComponent)) {
                const cameraShake = this.registry.getComponent(player, CameraShakeComponent);

                if (!cameraShake) {
                    throw new Error('Could not find some component(s) of entity with id ' + player);
                }

                this.eventBus.emitEvent(CameraShakeEvent, cameraShake.shakeDuration);
            }

            if (this.registry.hasComponent(projectile, TransformComponent)) {
                const transform = this.registry.getComponent(projectile, TransformComponent);

                if (!transform) {
                    throw new Error('Could not find some component(s) of entity with id ' + projectile);
                }

                this.eventBus.emitEvent(EntityHitEvent, player, transform.position);
            }
        }
    }

    onProjectileHitsEnemy(projectile: Entity, enemy: Entity) {
        const projectileComponent = this.registry.getComponent(projectile, ProjectileComponent);

        if (!projectileComponent) {
            throw new Error('Could not find some component(s) of entity with id ' + projectile);
        }

        if (projectileComponent.isFriendly && this.registry.hasComponent(enemy, HealthComponent)) {
            const health = this.registry.getComponent(enemy, HealthComponent);

            if (!health) {
                throw new Error('Could not find some component(s) of entity with id ' + enemy);
            }

            health.healthPercentage -= projectileComponent.hitPercentDamage;
            health.lastDamageTime = performance.now();

            if (health.healthPercentage <= 0) {
                this.eventBus.emitEvent(EntityKilledEvent, enemy);
                this.registry.killEntity(enemy);
            }

            this.registry.killEntity(projectile);

            if (this.registry.hasComponent(projectile, TransformComponent)) {
                const transform = this.registry.getComponent(projectile, TransformComponent);

                if (!transform) {
                    throw new Error('Could not find some component(s) of entity with id ' + projectile);
                }

                this.eventBus.emitEvent(EntityHitEvent, enemy, transform.position);
            }
        }
    }
}
