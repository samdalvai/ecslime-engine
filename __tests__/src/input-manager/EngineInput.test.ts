import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

import Engine from '../../../src/Engine';
import { IComponent } from '../../../src/ecs/Component';
import EventBus from '../../../src/event-bus/EventBus';
import GameEvent from '../../../src/event-bus/GameEvent';
import {
    KeyPressedEvent,
    KeyReleasedEvent,
    MouseMoveEvent,
    MousePressedEvent,
    MouseReleasedEvent,
    ScrollEvent,
} from '../../../src/events';
import InputManager from '../../../src/input-manager/InputManager';
import { MouseButton } from '../../../src/types/control';
import { Camera, Vector } from '../../../src/types/utils';

class TestEngine extends Engine {
    blocked = false;
    zoom = 1;
    suppress = false;
    hookScreenPositions: { screen: Vector; previous: Vector }[] = [];

    get input(): InputManager {
        return this.inputManager;
    }

    get bus(): EventBus {
        return this.eventBus;
    }

    protected setup = async () => undefined;
    protected update = () => undefined;
    protected render = () => undefined;

    protected createCamera(): Camera {
        // World bounds: left 0, top 150
        return { center: { x: 100, y: 75 }, viewportWidth: 200, viewportHeight: 150 };
    }

    protected isInputBlocked() {
        return this.blocked;
    }

    protected getZoom() {
        return this.zoom;
    }

    protected onKeyDown() {
        return !this.suppress;
    }

    protected onMouseMove(_event: MouseEvent, screenPosition: Vector) {
        this.hookScreenPositions.push({ screen: screenPosition, previous: { ...Engine.mousePositionScreen } });
        return !this.suppress;
    }

    protected onWheel() {
        return !this.suppress;
    }

    processInput() {
        super.processInput();
    }
}

const keyEvent = (type: string, code: string) => ({ type, code }) as KeyboardEvent;
const mouseEvent = (type: string, x: number, y: number, button = MouseButton.LEFT) =>
    ({ type, x, y, button }) as MouseEvent;
const wheelEvent = (deltaY: number) => ({ type: 'wheel', deltaY }) as WheelEvent;

const collect = <T extends GameEvent>(bus: EventBus, eventType: new (...args: any[]) => T) => {
    const events: T[] = [];
    bus.subscribeToEvent(eventType, null, (event: T) => events.push(event));
    return events;
};

describe('Engine input processing', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let engine: TestEngine;

    beforeAll(() => {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: { addEventListener: () => undefined },
        });
    });

    afterAll(() => {
        if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
        else Reflect.deleteProperty(globalThis, 'window');
    });

    beforeEach(() => {
        IComponent.resetIds();
        engine = new TestEngine();
    });

    test('Should emit key pressed and released events', () => {
        const pressed = collect(engine.bus, KeyPressedEvent);
        const released = collect(engine.bus, KeyReleasedEvent);

        engine.input.keyboardInputBuffer.push(keyEvent('keydown', 'KeyA'), keyEvent('keyup', 'KeyA'));
        engine.processInput();

        expect(pressed.map(e => e.keyCode)).toEqual(['KeyA']);
        expect(released.map(e => e.keyCode)).toEqual(['KeyA']);
        expect(engine.input.keyboardInputBuffer).toHaveLength(0);
    });

    test('Should emit mouse events with world coordinates and update the global mouse positions', () => {
        const moved = collect(engine.bus, MouseMoveEvent);
        const pressed = collect(engine.bus, MousePressedEvent);
        const released = collect(engine.bus, MouseReleasedEvent);

        engine.input.mouseInputBuffer.push(
            mouseEvent('mousemove', 10, 20),
            mouseEvent('mousedown', 10, 20, MouseButton.RIGHT),
            mouseEvent('mouseup', 10, 20, MouseButton.RIGHT),
        );
        engine.processInput();

        expect(moved.map(e => e.coordinates)).toEqual([{ x: 10, y: 130 }]);
        expect(pressed.map(e => [e.coordinates, e.button])).toEqual([[{ x: 10, y: 130 }, MouseButton.RIGHT]]);
        expect(released.map(e => [e.coordinates, e.button])).toEqual([[{ x: 10, y: 130 }, MouseButton.RIGHT]]);
        expect(Engine.mousePositionScreen).toEqual({ x: 10, y: 20 });
        expect(Engine.mousePositionWorld).toEqual({ x: 10, y: 130 });
    });

    test('Should apply the zoom when converting to world coordinates', () => {
        const moved = collect(engine.bus, MouseMoveEvent);
        engine.zoom = 2;

        engine.input.mouseInputBuffer.push(mouseEvent('mousemove', 10, 20));
        engine.processInput();

        expect(moved[0].coordinates).toEqual({ x: 5, y: 140 });
    });

    test('Should call mouse hooks before updating the global mouse positions', () => {
        engine.input.mouseInputBuffer.push(mouseEvent('mousemove', 10, 20), mouseEvent('mousemove', 30, 40));
        engine.processInput();

        expect(engine.hookScreenPositions[1]).toEqual({ screen: { x: 30, y: 40 }, previous: { x: 10, y: 20 } });
    });

    test('Should emit scroll events based on the wheel direction', () => {
        const scrolled = collect(engine.bus, ScrollEvent);

        engine.input.wheelInputBuffer.push(wheelEvent(-1), wheelEvent(1), wheelEvent(0));
        engine.processInput();

        expect(scrolled.map(e => e.direction)).toEqual(['up', 'down']);
    });

    test('Should not emit events when a hook returns false, but still track the mouse position', () => {
        const pressed = collect(engine.bus, KeyPressedEvent);
        const moved = collect(engine.bus, MouseMoveEvent);
        const scrolled = collect(engine.bus, ScrollEvent);
        engine.suppress = true;

        engine.input.keyboardInputBuffer.push(keyEvent('keydown', 'KeyA'));
        engine.input.mouseInputBuffer.push(mouseEvent('mousemove', 10, 20));
        engine.input.wheelInputBuffer.push(wheelEvent(-1));
        engine.processInput();

        expect(pressed).toHaveLength(0);
        expect(moved).toHaveLength(0);
        expect(scrolled).toHaveLength(0);
        expect(Engine.mousePositionScreen).toEqual({ x: 10, y: 20 });
    });

    test('Should discard all buffered input when input is blocked', () => {
        const pressed = collect(engine.bus, KeyPressedEvent);
        engine.blocked = true;

        engine.input.keyboardInputBuffer.push(keyEvent('keydown', 'KeyA'));
        engine.input.mouseInputBuffer.push(mouseEvent('mousemove', 10, 20));
        engine.input.wheelInputBuffer.push(wheelEvent(-1));
        engine.processInput();

        expect(pressed).toHaveLength(0);
        expect(engine.input.keyboardInputBuffer).toHaveLength(0);
        expect(engine.input.mouseInputBuffer).toHaveLength(0);
        expect(engine.input.wheelInputBuffer).toHaveLength(0);
    });
});
