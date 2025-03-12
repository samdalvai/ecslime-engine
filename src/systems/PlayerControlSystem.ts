import AnimationComponent from '../components/AnimationComponent';
import BoxColliderComponent from '../components/BoxColliderComponent';
import EntityDestinationComponent from '../components/EntityDestinationComponent';
import EntityEffectComponent from '../components/EntityEffectComponent';
import HighlightComponent from '../components/HighlightComponent';
import LifetimeComponent from '../components/LifetimeComponent';
import ParticleEmitComponent from '../components/ParticleEmitComponent';
import PlayerControlComponent from '../components/PlayerControlComponent';
import ProjectileComponent from '../components/ProjectileComponent';
import RangedAttackEmitterComponent from '../components/RangedAttackEmitterComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import SlowTimeComponent from '../components/SlowTimeComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import EventBus from '../event-bus/EventBus';
import KeyPressedEvent from '../events/KeyPressedEvent';
import KeyReleasedEvent from '../events/KeyReleasedEvent';
import MouseMoveEvent from '../events/MouseMoveEvent';
import MousePressedEvent from '../events/MousePressedEvent';
import RangedAttackEmitEvent from '../events/RangedAttackEmitEvent';
import { Flip, Vector } from '../types';
import { computeDirectionVector, computeUnitVector } from '../utils/vector';
import EntityDestinationSystem from './EntityDestinationSystem';
import RenderEntityDestinationSystem from './debug/RenderEntityDestinationSystem';

export default class PlayerControlSystem extends System {
    eventBus: EventBus;
    registry: Registry;
    mousePosition: Vector = { x: 0, y: 0 };

    constructor(eventBus: EventBus, registry: Registry) {
        super();
        this.eventBus = eventBus;
        this.registry = registry;
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(MousePressedEvent, this, this.onMousePressed);
        eventBus.subscribeToEvent(MouseMoveEvent, this, this.onMouseMove);
        eventBus.subscribeToEvent(KeyPressedEvent, this, this.onKeyPressed);
        eventBus.subscribeToEvent(KeyReleasedEvent, this, this.onKeyReleased);
    }

    onMousePressed = (event: MousePressedEvent) => {
        const x = event.coordinates.x;
        const y = event.coordinates.y;

        const player = this.registry.getEntityByTag('player');

        if (!player) {
            console.warn('Player entity not found');
            return;
        }

        const playerControl = player.getComponent(PlayerControlComponent);
        const rigidBody = player.getComponent(RigidBodyComponent);
        const transform = player.getComponent(TransformComponent);
        const sprite = player.getComponent(SpriteComponent);

        if (!playerControl || !rigidBody || !transform || !sprite) {
            throw new Error('Could not find some component(s) of entity with id ' + player.getId());
        }

        if (player.hasComponent(EntityDestinationComponent)) {
            player.removeComponent(EntityDestinationComponent);
            player.removeFromSystem(RenderEntityDestinationSystem);
            player.removeFromSystem(EntityDestinationSystem);
        }

        let enemyHighlighted = false;

        for (const enemy of player.registry.getEntitiesByGroup('enemies')) {
            if (enemy.hasComponent(HighlightComponent)) {
                const highlight = enemy.getComponent(HighlightComponent);

                if (!highlight) {
                    throw new Error('Could not find some component(s) of entity with id ' + enemy.getId());
                }

                if (highlight.isHighlighted) {
                    enemyHighlighted = true;
                    break;
                }
            }
        }

        // Avoid moving if left shift is pressed
        if (playerControl.keysPressed.includes('ShiftLeft') || enemyHighlighted) {
            if (player.hasComponent(RangedAttackEmitterComponent)) {
                this.eventBus.emitEvent(RangedAttackEmitEvent, { x, y });
            }

            rigidBody.velocity = { x: 0, y: 0 };
            return;
        }

        player.addComponent(EntityDestinationComponent, x, y, playerControl.velocity);
        player.addToSystem(RenderEntityDestinationSystem);
        player.addToSystem(EntityDestinationSystem);

        const currentDestination = this.registry.getEntityByTag('player-destination');

        if (currentDestination) {
            this.registry.removeEntityTag(currentDestination);
            currentDestination.kill();
        }

        const destinationAntimation = this.registry.createEntity();
        destinationAntimation.addComponent(SpriteComponent, 'destination-circle-texture', 32, 32, 1);
        destinationAntimation.addComponent(TransformComponent, { x: x - 16, y: y - 16 });
        destinationAntimation.addComponent(AnimationComponent, 8, 10);
        destinationAntimation.addComponent(LifetimeComponent, 1000);
        destinationAntimation.tag('player-destination');
    };

    onMouseMove = (event: MouseMoveEvent) => {
        this.mousePosition = event.coordinates;
    };

    onKeyPressed = (event: KeyPressedEvent) => {
        const player = this.registry.getEntityByTag('player');

        if (!player) {
            console.warn('Player entity not found');
            return;
        }

        const playerControl = player.getComponent(PlayerControlComponent);

        if (!playerControl) {
            throw new Error('Could not find some component(s) of entity with id ' + player.getId());
        }

        switch (event.keyCode) {
            case 'ShiftLeft':
                playerControl.keysPressed.push(event.keyCode);
                break;
            case 'Digit1':
                this.emitMagicBubble(this.mousePosition);
                break;
            case 'Digit2':
                this.emitFireball(this.mousePosition);
                break;
        }
    };

    onKeyReleased = (event: KeyReleasedEvent) => {
        const player = this.registry.getEntityByTag('player');

        if (!player) {
            console.warn('Player entity not found');
            return;
        }

        const playerControl = player.getComponent(PlayerControlComponent);

        if (!playerControl) {
            throw new Error('Could not find some component(s) of entity with id ' + player.getId());
        }

        playerControl.keysPressed = playerControl.keysPressed.filter(key => key !== event.keyCode);
    };

    private emitMagicBubble = (coordinates: Vector) => {
        const scale = 1.0;

        const bubbleFloor = this.registry.createEntity();
        bubbleFloor.addComponent(
            TransformComponent,
            { x: coordinates.x - 64 * scale, y: coordinates.y - 64 * scale },
            { x: scale, y: scale },
            0,
        );
        bubbleFloor.addComponent(SpriteComponent, 'magic-bubble-texture', 128, 128, 1, 0, 128, Flip.NONE, false, 0.5);
        bubbleFloor.addComponent(AnimationComponent, 4, 20, false);
        bubbleFloor.addComponent(LifetimeComponent, 5000);

        const bubbleTop = this.registry.createEntity();
        bubbleTop.addComponent(
            TransformComponent,
            { x: coordinates.x - 64 * scale, y: coordinates.y - 64 * scale },
            { x: scale, y: scale },
            0,
        );
        bubbleTop.addComponent(SpriteComponent, 'magic-bubble-texture', 128, 128, 3, 0, 256, Flip.NONE, false, 0.3);
        bubbleTop.addComponent(AnimationComponent, 4, 20, false);
        bubbleTop.addComponent(SlowTimeComponent, 60 * scale, 0.2, true);
        bubbleTop.addComponent(LifetimeComponent, 5000);
        bubbleTop.group('slow-time');
    };

    private emitFireball = (coordinates: Vector) => {
        const player = this.registry.getEntityByTag('player');

        if (!player) {
            throw new Error('Could not find entity with tag "Player"');
        }

        const transform = player.getComponent(TransformComponent);
        const sprite = player.getComponent(SpriteComponent);

        if (!transform || !sprite) {
            throw new Error('Could not find some component(s) of entity with id ' + player.getId());
        }

        const projectileDirection = computeDirectionVector(
            transform.position.x + (sprite.width / 2) * transform.scale.x,
            transform.position.y + (sprite.height / 2) * transform.scale.y,
            coordinates.x,
            coordinates.y,
            200,
        );

        if (player.hasComponent(RigidBodyComponent)) {
            const rigidBody = player.getComponent(RigidBodyComponent);

            if (!rigidBody) {
                throw new Error('Could not find some component(s) of entity with id ' + player.getId());
            }

            rigidBody.direction = computeUnitVector(projectileDirection.x, projectileDirection.y);
        }

        const projectilePosition = { x: transform.position.x - 16, y: transform.position.y - 16 };

        if (player.hasComponent(SpriteComponent)) {
            const sprite = player.getComponent(SpriteComponent);

            if (!sprite) {
                throw new Error('Could not find some component(s) of entity with id ' + player.getId());
            }

            projectilePosition.x += (sprite.width / 2) * transform.scale.x;
            projectilePosition.y += (sprite.height / 2) * transform.scale.y;
        }

        // atan2 returns values between -π and +π radians, which correspond to angles between -180 and +180 degrees.
        const angleInRadians = Math.atan2(projectileDirection.x, projectileDirection.y);
        let angleInDegrees = -1 * angleInRadians * (180 / Math.PI);

        // Ensure the angle is between 0 and 360 degrees
        if (angleInDegrees < 0) {
            angleInDegrees += 360;
        }

        const projectile = this.registry.createEntity();
        projectile.group('projectiles');
        projectile.addComponent(TransformComponent, projectilePosition, { x: 1.0, y: 1.0 }, angleInDegrees);
        projectile.addComponent(RigidBodyComponent, projectileDirection);
        projectile.addComponent(SpriteComponent, 'fireball-texture', 32, 32, 4, 0, 32 * 2);
        projectile.addComponent(BoxColliderComponent, 8, 8, { x: 12, y: 12 });
        projectile.addComponent(ProjectileComponent, true, 20);
        projectile.addComponent(LifetimeComponent, 5000);
        projectile.addComponent(ParticleEmitComponent, 3, 300, 'rgba(255,100,100,0.5)', 25, 20, 16, 16);
        projectile.addComponent(EntityEffectComponent);
    };
}
