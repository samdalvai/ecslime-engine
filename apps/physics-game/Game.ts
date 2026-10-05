import { Camera, Engine, PhysicsBridge, beginWorldRender, endWorldRender, screenToWorld } from 'ecslime-engine';

import { gameComponentCatalog } from './catalog/gameComponentCatalog';
import { RigidBodyComponent, SpriteComponent, TransformComponent } from './components';
import * as GameEvents from './events';
import * as Systems from './systems';

export default class Game extends Engine {
    private physicsBridge: PhysicsBridge;

    constructor() {
        super();
        this.levelManager.setComponentCatalog(gameComponentCatalog);
        this.physicsBridge = new PhysicsBridge();
    }

    protected createCamera(): Camera {
        return {
            center: { x: 0, y: 0 },
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };
    }

    setup = async () => {
        // Rendering systems
        this.registry.addSystem(Systems.RenderSystem);
        this.registry.addSystem(Systems.PhysicsSystem);

        // Other entities related systems
        // this.registry.addSystem(Systems.MovementSystem);

        // Debug systems
        this.registry.addSystem(Systems.DebugInfoSystem);
        this.registry.addSystem(Systems.DebugPhysicsBody);
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }

        this.isDebug = true;

        this.assetStore.addTexture('crate', 'assets/sprites/crate.png');

        const entity1 = this.registry.createEntity();
        entity1.addComponent(SpriteComponent, 'crate', 32, 32);
        entity1.addComponent(TransformComponent, { x: 15, y: 0 });
        entity1.addComponent(RigidBodyComponent, { shape: { kind: 'box', width: 32, height: 32 }, mass: 1 });

        const entity2 = this.registry.createEntity();
        entity2.addComponent(TransformComponent, { x: 0, y: -100 });
        entity2.addComponent(RigidBodyComponent, { shape: { kind: 'box', width: 20, height: 20 }, mass: 0 });

        const floor = this.registry.createEntity();
        floor.addComponent(TransformComponent, { x: 0, y: -175 });
        floor.addComponent(RigidBodyComponent, { shape: { kind: 'box', width: 500, height: 10 }, mass: 0 });

        Game.mapHeight = 1080;
        Game.mapWidth = 1920;
    };

    processInput = () => {
        // Hanlde keyboard events
        while (this.inputManager.keyboardInputBuffer.length > 0) {
            const inputEvent = this.inputManager.keyboardInputBuffer.shift();

            if (!inputEvent) {
                return;
            }

            switch (inputEvent.type) {
                case 'keydown':
                    if (inputEvent.code === 'F2') {
                        this.isDebug = !this.isDebug;
                    }

                    this.eventBus.emitEvent(GameEvents.KeyPressedEvent, inputEvent.code);
                    break;
                case 'keyup':
                    this.eventBus.emitEvent(GameEvents.KeyReleasedEvent, inputEvent.code);
                    break;
            }
        }

        // Handle mouse events
        while (this.inputManager.mouseInputBuffer.length > 0) {
            const inputEvent = this.inputManager.mouseInputBuffer.shift();

            if (!inputEvent) {
                return;
            }

            Engine.mousePositionScreen = {
                x: inputEvent.x,
                y: inputEvent.y,
            };

            switch (inputEvent.type) {
                case 'mousemove':
                    Engine.mousePositionWorld = screenToWorld(Engine.mousePositionScreen, this.camera);

                    this.eventBus.emitEvent(GameEvents.MouseMoveEvent, Engine.mousePositionWorld);
                    break;
                case 'mousedown':
                    this.eventBus.emitEvent(
                        GameEvents.MousePressedEvent,
                        screenToWorld({ x: inputEvent.x, y: inputEvent.y }, this.camera),
                        inputEvent.button,
                    );
                    break;
                case 'mouseup':
                    this.eventBus.emitEvent(
                        GameEvents.MouseReleasedEvent,
                        screenToWorld({ x: inputEvent.x, y: inputEvent.y }, this.camera),
                        inputEvent.button,
                    );
                    break;
            }
        }
    };

    update = (deltaTime: number) => {
        // Reset all event handlers for the current frame
        this.eventBus.reset();

        // Update entities to be created/killed
        this.registry.update();

        // Perform the subscription of the events for all systems
        // this.registry.getSystem(Systems.MovementSystem)?.subscribeToEvents(this.eventBus);

        // Invoke all the systems that need to update
        this.registry.getSystem(Systems.PhysicsSystem).update(deltaTime, this.physicsBridge);
    };

    render = () => {
        if (!this.canvas || !this.ctx) {
            throw new Error('Failed to get 2D context for the canvas.');
        }

        // Clear the whole canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        beginWorldRender(this.ctx, this.camera);
        this.registry.getSystem(Systems.RenderSystem).update(this.ctx, this.assetStore, this.camera);

        if (this.isDebug) {
            this.registry.getSystem(Systems.DebugPhysicsBody).update(this.ctx, this.camera, this.physicsBridge);
        }
        endWorldRender(this.ctx);

        if (this.isDebug) {
            this.registry
                .getSystem(Systems.DebugInfoSystem)
                .update(this.ctx, this.currentFPS, this.maxFPS, this.frameDuration, this.registry, this.camera);
        }
    };
}
