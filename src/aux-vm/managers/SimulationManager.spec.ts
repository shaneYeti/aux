import { Observable, Subject } from 'rxjs';
import { SimulationManager } from './SimulationManager';
import { Initable } from './Initable';

console.error = jest.fn();

describe('SimulationManager', () => {
    it('should start empty', () => {
        let called = false;
        const manager = new SimulationManager(id => {
            called = true;
            return new TestInitable();
        });

        expect(manager.primary).toBeFalsy();
        expect(called).toBe(false);
    });

    describe('addSimulation()', () => {
        it('should make a new simulation and add it to the simulations map', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const added = await manager.addSimulation('test');

            expect(manager.simulations.has('test')).toBe(true);
            expect(added).toBe(manager.simulations.get('test'));
            expect(manager.simulations.get('test').initialized).toBe(true);
        });

        it('should not add the simulation if it already exists', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const val = new TestInitable();
            manager.simulations.set('test', val);

            const added = await manager.addSimulation('test');

            expect(manager.simulations.get('test')).toBe(val);
            expect(val.initialized).toBeFalsy();
            expect(added).toBe(val);
        });

        it('should trigger a simulationAdded event', async () => {
            let sims: TestInitable[] = [];
            const manager = new SimulationManager(id => new TestInitable());
            manager.simulationAdded.subscribe(sim => sims.push(sim));

            const added = await manager.addSimulation('test');

            expect(sims.length).toBe(1);
        });

        // it('should not add the simulation if an error happens during initialization', async () => {
        //     const manager = new SimulationManager(
        //         id =>
        //             new TestInitable(() => {
        //                 return {
        //                     type: 'exception',
        //                     exception: new Error('abc'),
        //                 };
        //             })
        //     );

        //     let sims: TestInitable[] = [];
        //     manager.simulationAdded.subscribe(sim => sims.push(sim));

        //     let removed: TestInitable[] = [];
        //     manager.simulationRemoved.subscribe(sim => removed.push(sim));
        //     const [added, err] = await manager.addSimulation('test');

        //     expect(added).toBe(null);
        //     expect(err).toEqual({
        //         type: 'exception',
        //         exception: expect.any(Error),
        //     });

        //     expect(sims.length).toBe(0);
        // });
    });

    describe('removeSimulation()', () => {
        it('should do nothing if the simulation doesnt exist', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            await manager.removeSimulation('test');
        });

        it('should remove the given simulation from the map', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const val = new TestInitable();
            manager.simulations.set('test', val);

            await manager.removeSimulation('test');

            expect(manager.simulations.has('test')).toBe(false);
            expect(val.closed).toBe(true);
        });

        it('should clear the primary sim if the removed is the primary', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const val = new TestInitable();
            manager.simulations.set('test', val);
            manager.primary = val;

            await manager.removeSimulation('test');

            expect(manager.primary).toBe(null);
        });

        it('should trigger a simulationRemoved event', async () => {
            let sims: TestInitable[] = [];
            const manager = new SimulationManager(id => new TestInitable());
            manager.simulationRemoved.subscribe(sim => sims.push(sim));

            const added = await manager.addSimulation('test');
            await manager.removeSimulation('test');

            expect(sims).toEqual([added]);
        });
    });

    describe('setPrimary()', () => {
        it('should initialize the primary simulation', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            expect(manager.primary).toBeFalsy();

            await manager.setPrimary('test');

            expect(manager.primary).toBeInstanceOf(TestInitable);
            expect(manager.primary.initialized).toBe(true);
        });
    });

    describe('clear()', () => {
        it('should dispose and remove all the simulations', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const sim = new TestInitable();
            manager.simulations.set('test', sim);
            manager.simulations.set('test2', new TestInitable());
            manager.primary = sim;

            await manager.clear();

            expect(manager.simulations.size).toBe(0);
            expect(manager.primary).toBe(null);
        });
    });

    describe('simulationAdded', () => {
        it('should replay all the simulationAdded events on subscription', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            const added = await manager.addSimulation('test');
            let sims: TestInitable[] = [];
            manager.simulationAdded.subscribe(sim => sims.push(sim));

            expect(sims.length).toBe(1);
            expect(sims).toEqual([added]);
        });

        it('should not include simulations that have been removed in the replay', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            await manager.addSimulation('test');
            await manager.removeSimulation('test');

            let sims: TestInitable[] = [];
            manager.simulationAdded.subscribe(sim => sims.push(sim));

            expect(sims).toEqual([]);
        });
    });

    describe('simulationRemoved', () => {
        it('should not replay all the simulationRemoved events on subscription', async () => {
            const manager = new SimulationManager(id => new TestInitable());

            await manager.addSimulation('test');
            await manager.removeSimulation('test');

            let sims: TestInitable[] = [];
            manager.simulationRemoved.subscribe(sim => sims.push(sim));

            expect(sims).toEqual([]);
        });
    });
});

class TestInitable implements Initable {
    onError = new Subject<any>();
    initialized: boolean;
    closed: boolean;

    action: Function;

    constructor(action?: Function) {
        this.action = action;
    }

    async init() {
        this.initialized = true;
        if (this.action) {
            return this.action();
        }
        return null;
    }

    unsubscribe(): void {
        this.closed = true;
    }
}
