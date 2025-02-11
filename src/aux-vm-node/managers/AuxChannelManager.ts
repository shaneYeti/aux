import {
    ChannelManager,
    LoadedChannel,
} from '@casual-simulation/causal-tree-server';
import { AuxCausalTree } from '@casual-simulation/aux-common';
import { RealtimeChannelInfo } from '@casual-simulation/causal-trees';
import { NodeAuxChannel } from '../vm/NodeAuxChannel';
import { NodeSimulation } from './NodeSimulation';

/**
 * Defines an interface for objects which are able to load aux channels.
 */
export interface AuxChannelManager extends ChannelManager {
    /**
     * Loads the channel for the given info and returns a subscription that can be used to disconnect from the tree.
     * @param info The info that describes the channel that should be loaded.
     */
    loadChannel(info: RealtimeChannelInfo): Promise<AuxLoadedChannel>;
}

export interface AuxLoadedChannel extends LoadedChannel {
    tree: AuxCausalTree;
    channel: NodeAuxChannel;
    simulation: NodeSimulation;
}
