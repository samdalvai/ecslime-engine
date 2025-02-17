import RigidBodyComponent from '../src/components/RigidBodyComponent';
import TransformComponent from '../src/components/TransformComponent';
import Registry from '../src/ecs/Registry';
import Game from '../src/game/Game';
import MovementSystem from '../src/systems/MovementSystem';

describe('Testing performance related functions', () => {
    test('A test on performance', () => {
        Game.mapHeight = 10000;
        Game.mapWidth = 10000;

        const timeAdd: number[] = [];
        const timeUpdate: number[] = [];
        const timeDelete: number[] = [];
        const timesTotal: number[] = [];

        for (let x = 0; x < 100; x++) {
            const start = performance.now();
            const registry = new Registry();
            registry.addSystem(MovementSystem);

            for (let i = 0; i < 10000; i++) {
                const entity = registry.createEntity();
                registry.addComponent(entity, RigidBodyComponent, { x: 10, y: 10 });
                registry.addComponent(entity, TransformComponent, { x: 100, y: 100 });
            }

            registry.update();

            timeAdd.push(performance.now() - start);
            const startUpdate = performance.now();

            const system = registry.getSystem(MovementSystem);

            system?.update(10);
            timeUpdate.push(performance.now() - startUpdate);

            const startDelete = performance.now();

            system?.getSystemEntities().forEach(entity => registry.killEntity(entity));
            registry.update();

            timeDelete.push(performance.now() - startDelete);

            timesTotal.push(performance.now() - start);

            expect(system?.getSystemEntities().length).toBe(0);
        }

        let sum = 0;
        for (let x = 0; x < timeAdd.length; x++) {
            sum += timeAdd[x];
        }
        console.log('Time for adding entitites: ' + sum / timeAdd.length + ' ms');

        sum = 0;
        for (let x = 0; x < timeAdd.length; x++) {
            sum += timeUpdate[x];
        }
        console.log('Time for updating entitites: ' + sum / timeUpdate.length + ' ms');

        sum = 0;
        for (let x = 0; x < timeDelete.length; x++) {
            sum += timeDelete[x];
        }
        console.log('Time for deleting entitites: ' + sum / timeDelete.length + ' ms');

        sum = 0;
        for (let x = 0; x < timesTotal.length; x++) {
            sum += timesTotal[x];
        }
        console.log('Total time: ' + sum / timesTotal.length + ' ms');
    });
});
