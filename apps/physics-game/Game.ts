import { Camera, Engine, beginWorldRender, endWorldRender, screenToWorld } from 'ecslime-engine';

import { gameComponentCatalog } from './catalog/gameComponentCatalog';
import * as GameEvents from './events';
import * as Systems from './systems';

export default class Game extends Engine {
    constructor() {
        super();
        this.levelManager.setComponentCatalog(gameComponentCatalog);
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

        // Other entities related systems
        // this.registry.addSystem(Systems.MovementSystem);

        // Debug systems
        this.registry.addSystem(Systems.DebugInfoSystem);
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
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
        // this.registry.getSystem(Systems.PlayerDetectionSystem)?.update(this.registry);
    };

    render = () => {
        if (!this.canvas || !this.ctx) {
            throw new Error('Failed to get 2D context for the canvas.');
        }

        // Clear the whole canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        beginWorldRender(this.ctx, this.camera);
        this.registry.getSystem(Systems.RenderSystem)?.update(this.ctx, this.assetStore, this.camera);

        if (this.isDebug) {
            // this.registry.getSystem(Systems.DebugColliderSystem)?.update(this.ctx, this.camera);
        }
        endWorldRender(this.ctx);

        if (this.isDebug) {
            this.registry
                .getSystem(Systems.DebugInfoSystem)
                ?.update(this.ctx, this.currentFPS, this.maxFPS, this.frameDuration, this.registry, this.camera);
            // this.registry.getSystem(Systems.DebugCursorCoordinatesSystem)?.update(this.ctx);
        }
    };
}
