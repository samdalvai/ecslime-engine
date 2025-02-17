import BoxColliderComponent from '../components/BoxColliderComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import SpriteComponent from '../components/SpriteComponent';
import TransformComponent from '../components/TransformComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';
import EventBus from '../event-bus/EventBus';
import CollisionEvent from '../events/CollisionEvent';
import Game from '../game/Game';
import { Entity } from '../types';

export default class MovementSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(TransformComponent);
        this.requireComponent(RigidBodyComponent);
    }

    subscribeToEvents(eventBus: EventBus) {
        eventBus.subscribeToEvent(CollisionEvent, this, this.onCollision);
    }

    onCollision(event: CollisionEvent) {
        const a = event.a;
        const b = event.b;

        if (this.registry.entityBelongsToGroup(a, 'enemies') && (this.registry.entityBelongsToGroup(b,'obstacles') || this.registry.entityHasTag(b, 'player'))) {
            this.onEnemyHitsObstacleOrPlayer(a);
        }
        if ((this.registry.entityBelongsToGroup(a, 'obstacles') || this.registry.entityHasTag(a, 'player')) && this.registry.entityBelongsToGroup(b,'enemies')) {
            this.onEnemyHitsObstacleOrPlayer(b);
        }

        if (this.registry.entityHasTag(a, 'player') && (this.registry.entityBelongsToGroup(b,'enemies') || this.registry.entityBelongsToGroup(b,'obstacles'))) {
            this.onPlayerHitsEnemyOrObstacle(a, b);
        }
        if ((this.registry.entityBelongsToGroup(a, 'enemies') || this.registry.entityBelongsToGroup(a, 'obstacles')) && this.registry.entityHasTag(b, 'player')) {
            this.onPlayerHitsEnemyOrObstacle(b, a);
        }
    }

    onEnemyHitsObstacleOrPlayer(enemy: Entity) {
        if (
            this.registry.hasComponent(enemy, RigidBodyComponent) &&
            this.registry.hasComponent(enemy, SpriteComponent)
        ) {
            const rigidbody = this.registry.getComponent(enemy, RigidBodyComponent);
            const sprite = this.registry.getComponent(enemy, SpriteComponent);

            if (!rigidbody || !sprite) {
                throw new Error('Could not find some component(s) of entity with id ' + enemy);
            }

            if (rigidbody.velocity.x != 0) {
                rigidbody.velocity.x *= -1;
                rigidbody.direction.x *= -1;
            }

            if (rigidbody.velocity.y != 0) {
                rigidbody.velocity.y *= -1;
                rigidbody.direction.y *= -1;
            }
        }
    }

    onPlayerHitsEnemyOrObstacle(player: Entity, obstacle: Entity) {
        if (
            this.registry.hasComponent(player, RigidBodyComponent) &&
            this.registry.hasComponent(player, TransformComponent)
        ) {
            const playerRigidBody = this.registry.getComponent(player, RigidBodyComponent);
            const playerTransform = this.registry.getComponent(player, TransformComponent);
            const playerCollider = this.registry.getComponent(player, BoxColliderComponent);

            const obstacleTransform = this.registry.getComponent(obstacle, TransformComponent);
            const obstacleCollider = this.registry.getComponent(obstacle, BoxColliderComponent);

            if (!playerRigidBody || !playerTransform || !playerCollider) {
                throw new Error('Could not find some component(s) of entity with id ' + player);
            }

            if (!obstacleTransform || !obstacleCollider) {
                throw new Error('Could not find some component(s) of entity with id ' + player);
            }

            // Shift player back based on the collider dimension and position of the two entities

            // Player is colliding from the right
            if (playerRigidBody.velocity.x > 0) {
                playerTransform.position.x =
                    obstacleTransform.position.x -
                    playerCollider.width * playerTransform.scale.x +
                    obstacleCollider.offset.x -
                    playerCollider.offset.x;
                playerRigidBody.velocity.x = 0;
            }

            // Player is colliding from the left
            if (playerRigidBody.velocity.x < 0) {
                playerTransform.position.x =
                    obstacleTransform.position.x +
                    obstacleCollider.width * obstacleTransform.scale.x +
                    obstacleCollider.offset.x -
                    playerCollider.offset.x;
                playerRigidBody.velocity.x = 0;
            }

            // Player is colliding from the top
            if (playerRigidBody.velocity.y > 0) {
                playerTransform.position.y =
                    obstacleTransform.position.y -
                    playerCollider.height * playerTransform.scale.y +
                    obstacleCollider.offset.y -
                    playerCollider.offset.y;
                playerRigidBody.velocity.y = 0;
            }

            // Player is colliding from the bottom
            if (playerRigidBody.velocity.y < 0) {
                playerTransform.position.y =
                    obstacleTransform.position.y +
                    obstacleCollider.height * obstacleTransform.scale.y +
                    obstacleCollider.offset.y -
                    playerCollider.offset.y;
                playerRigidBody.velocity.y = 0;
            }
        }
    }

    update(deltaTime: number) {
        for (const entity of this.getSystemEntities()) {
            const transform = this.registry.getComponent(entity, TransformComponent);
            const rigidBody = this.registry.getComponent(entity, RigidBodyComponent);

            if (!rigidBody || !transform) {
                console.error('Could not find some component(s) of entity: ', entity);
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            transform.position.x += rigidBody.velocity.x * deltaTime;
            transform.position.y += rigidBody.velocity.y * deltaTime;

            if (this.registry.entityHasTag(entity, 'player')) {
                const paddingLeft = 10;
                const paddingTop = 10;
                const paddingRight = 50;
                const paddingBottom = 50;
                transform.position.x = transform.position.x < paddingLeft ? paddingLeft : transform.position.x;
                transform.position.x =
                    transform.position.x > Game.mapWidth - paddingRight
                        ? Game.mapWidth - paddingRight
                        : transform.position.x;
                transform.position.y = transform.position.y < paddingTop ? paddingTop : transform.position.y;
                transform.position.y =
                    transform.position.y > Game.mapHeight - paddingBottom
                        ? Game.mapHeight - paddingBottom
                        : transform.position.y;
            }

            const cullingMargin = 100;

            const isEntityOutsideMap =
                transform.position.x < -cullingMargin ||
                transform.position.x > Game.mapWidth + cullingMargin ||
                transform.position.y < -cullingMargin ||
                transform.position.y > Game.mapHeight + cullingMargin;

            // Kill all entities that move outside the map boundaries
            if (isEntityOutsideMap && !this.registry.entityHasTag(entity, 'player')) {
                this.registry.killEntity(entity);
            }
        }
    }
}
