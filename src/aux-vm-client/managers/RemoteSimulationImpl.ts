import {
    AuxUser,
    AuxVM,
    BaseSimulation,
    LoginManager,
    AuxConfig,
    AuxPartitionConfig,
} from '@casual-simulation/aux-vm';
import { RemoteSimulation } from './RemoteSimulation';

/**
 * Defines a class that provides an implementation of RemoteSimulation.
 */
export class RemoteSimulationImpl extends BaseSimulation
    implements RemoteSimulation {
    private _login: LoginManager;

    get login() {
        return this._login;
    }

    constructor(
        id: string,
        config: { isBuilder: boolean; isPlayer: boolean },
        partitions: AuxPartitionConfig,
        createVm: (config: AuxConfig) => AuxVM
    ) {
        super(id, config, partitions, createVm);
        this._login = new LoginManager(this._vm);
    }
}
