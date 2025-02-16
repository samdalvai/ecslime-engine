import RigidBodyComponent from '../src/components/RigidBodyComponent';
import TransformComponent from '../src/components/TransformComponent';
import Registry from '../src/ecs/Registry';
import Game from '../src/game/Game';
import MovementSystem from '../src/systems/MovementSystem';

describe('Testing performance related functions', () => {
    test('A test on performance', () => {
        // const times: number[] = [];

        // for (let x = 0; x < 10; x++) {
        //     const start = performance.now();

        //     // Code to be tested
        //     for (let i = 0; i < 1000; i++) {
        //         //
        //     }

        //     const end = performance.now();
        //     times.push(end - start);
        // }

        // let sum = 0;
        // for (let x = 0; x < times.length; x++) {
        //     sum += times[x];
        // }
        // console.log('Time elapsed: ' + sum / times.length + ' ms');

        Game.mapHeight = 10000;
        Game.mapWidth = 10000;
        Game.registry = new Registry();

        // const registry = new Registry();
        Game.registry.addSystem(MovementSystem);
        let start = performance.now();

        for (let i = 0; i < 10000; i++) {
            const entity = Game.registry.createEntity();
            Game.registry.addComponent(entity, RigidBodyComponent, { x: 10, y: 10 });
            Game.registry.addComponent(entity, TransformComponent, { x: 100, y: 100 });
        }

        Game.registry.update();

        console.log('Time for adding entitites: ' + (performance.now() - start) + ' ms');

        start = performance.now();
        const system = Game.registry.getSystem(MovementSystem);
        console.log(system?.getSystemEntities().length + ' entities');

        system?.update(10);

        console.log('Time for updating entitites: ' + (performance.now() - start) + ' ms');
    });
});
