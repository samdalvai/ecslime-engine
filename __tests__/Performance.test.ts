import RigidBodyComponent from '../src/components/RigidBodyComponent';
import TransformComponent from '../src/components/TransformComponent';
import Registry from '../src/ecs/Registry';
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
        const registry = new Registry();
        registry.addSystem(MovementSystem);
        let start = performance.now();

        for (let i = 0; i < 10000; i++) {
            const entity = registry.createEntity();
            entity.addComponent(RigidBodyComponent, { x: 10, y: 10 });
            entity.addComponent(TransformComponent, { x: 100, y: 100 });
        }

        registry.update();

        console.log('Time for adding entitites: ' + (performance.now() - start) + ' ms');

        start = performance.now();
        const system = registry.getSystem(MovementSystem);
        console.log(system?.getSystemEntities().length + ' entities');

        system?.update(10);

        console.log('Time for updateing entitites: ' + (performance.now() - start) + ' ms');
    });
});
