import { Entity, EventBus, System } from 'ecslime-engine';

import CameraShakeComponent from '../components/CameraShakeComponent';
import EntityEffectComponent from '../components/EntityEffectComponent';
import HealthComponent from '../components/HealthComponent';
import MeleeAttackComponent from '../components/MeleeAttackComponent';
import ProjectileComponent from '../components/ProjectileComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import CameraShakeEvent from '../events/CameraShakeEvent';
import CollisionEvent from '../events/CollisionEvent';
import EntityHitEvent from '../events/EntityHitEvent';
import EntityKilledEvent from '../events/EntityKilledEvent';
import SoundEmitEvent from '../events/SoundEmitEvent';

export default class DamageSystem extends System {
    eventBus: EventBus;

    constructor(eventBus: EventBus) {
        super();
        this.eventBus = eventBus;
        this.requireComponent(HealthComponent);
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(CollisionEvent, this, this.onCollision);
    }

    onCollision(event: CollisionEvent) {
        const a = event.a;
        const b = event.b;

        if (!this.handleCollision(a, b)) {
            this.handleCollision(b, a);
        }
    }

    handleCollision = (source: Entity, target: Entity) => {
        if (source.belongsToGroup('projectiles') && target.hasTag('player')) {
            this.onProjectileHitsEntity(source, target);
            return true;
        }

        if (source.belongsToGroup('projectiles') && target.belongsToGroup('enemies')) {
            this.onProjectileHitsEntity(source, target);
            return true;
        }

        if (source.belongsToGroup('melee-attack') && (target.hasTag('player') || target.belongsToGroup('enemies'))) {
            this.onMeleeAttackHitsEntity(source, target);
            return true;
        }

        return false;
    };

    onProjectileHitsEntity = (projectile: Entity, entity: Entity) => {
        const projectileComponent = projectile.getComponent(ProjectileComponent);

        if (entity.hasTag('player') && projectileComponent.isFriendly) {
            return;
        }

        if (!entity.hasTag('player') && !projectileComponent.isFriendly) {
            return;
        }

        const health = entity.getComponent(HealthComponent);

        health.healthPercentage -= projectileComponent.hitPercentDamage;
        health.lastDamageTime = performance.now();

        projectile.kill();

        if (entity.hasComponent(CameraShakeComponent)) {
            const cameraShake = entity.getComponent(CameraShakeComponent);

            this.eventBus.emitEvent(CameraShakeEvent, cameraShake.shakeDuration);
        }

        if (projectile.hasComponent(TransformComponent) && projectile.hasComponent(SpriteComponent)) {
            const transform = projectile.getComponent(TransformComponent);

            this.eventBus.emitEvent(EntityHitEvent, entity, { ...transform.position });

            this.eventBus.emitEvent(SoundEmitEvent, 'entity_hit', 0.05);
        }
    };

    onMeleeAttackHitsEntity(meleeAttack: Entity, entity: Entity) {
        if (meleeAttack.hasComponent(MeleeAttackComponent)) {
            const meleeAttackComp = meleeAttack.getComponent(MeleeAttackComponent);

            if (entity.hasTag('player') && meleeAttackComp.isFriendly) {
                return;
            }

            const health = entity.getComponent(HealthComponent);

            health.healthPercentage -= meleeAttackComp.hitPercentDamage;
            health.lastDamageTime = performance.now();

            meleeAttack.removeComponent(MeleeAttackComponent);
        }
    }

    update = () => {
        for (const entity of this.getSystemEntities()) {
            const health = entity.getComponent(HealthComponent);

            if (health.healthPercentage <= 0) {
                this.eventBus.emitEvent(EntityKilledEvent, entity);
                entity.kill();
            }

            if (entity.hasComponent(EntityEffectComponent)) {
                const entityEffect = entity.getComponent(EntityEffectComponent);

                if (!entityEffect.hasDamageOverTime) {
                    continue;
                }

                if (performance.now() - entityEffect.lastDamageTime >= 1000) {
                    health.healthPercentage -= entityEffect.damagePerSecond;
                    health.lastDamageTime = performance.now();

                    entityEffect.lastDamageTime = performance.now();
                }
            }
        }
    };
}
