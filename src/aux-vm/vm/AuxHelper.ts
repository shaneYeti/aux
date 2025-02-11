import {
    AuxCausalTree,
    SandboxLibrary,
    LocalActions,
    BotsState,
    getActiveObjects,
    createCalculationContext,
    BotCalculationContext,
    AuxBot,
    AuxState,
    BotAction,
    BotActions,
    createBot,
    Bot,
    updateBot,
    PartialBot,
    merge,
    AUX_BOT_VERSION,
    calculateFormulaEvents,
    calculateActionEvents,
    BotSandboxContext,
    DEFAULT_USER_MODE,
    PasteStateAction,
    getBotConfigContexts,
    createWorkspace,
    createContextId,
    duplicateBot,
    cleanBot,
    addState,
    Sandbox,
    SandboxFactory,
    searchBotState,
    AuxOp,
    createFormulaLibrary,
    FormulaLibraryOptions,
    addToContextDiff,
    botAdded,
    botUpdated,
    getBotPosition,
    getContexts,
    filterWellKnownAndContextTags,
    tagsOnBot,
    calculateActionResults,
    ON_ACTION_ACTION_NAME,
    action,
    GLOBALS_BOT_ID,
    parseFilterTag,
    BotTags,
    resolveRejectedActions,
    reject,
} from '@casual-simulation/aux-common';
import {
    storedTree,
    StoredCausalTree,
    RemoteAction,
    DeviceAction,
} from '@casual-simulation/causal-trees';
import { Subject, Observable } from 'rxjs';
import { flatMap, fromPairs, union, sortBy } from 'lodash';
import { BaseHelper } from '../managers/BaseHelper';
import { AuxUser } from '../AuxUser';
import {
    AuxPartitions,
    getPartitionState,
    AuxPartition,
} from '../partitions/AuxPartition';

/**
 * Definesa a class that contains a set of functions to help an AuxChannel
 * run formulas and process bot events.
 */
export class AuxHelper extends BaseHelper<AuxBot> {
    private static readonly _debug = false;
    private _partitions: AuxPartitions;
    private _lib: SandboxLibrary;
    private _localEvents: Subject<LocalActions[]>;
    private _remoteEvents: Subject<RemoteAction[]>;
    private _deviceEvents: Subject<DeviceAction[]>;
    private _sandboxFactory: SandboxFactory;

    /**
     * Creates a new bot helper.
     * @param partitions The partitions that the helper should use.
     */
    constructor(
        partitions: AuxPartitions,
        config?: FormulaLibraryOptions['config'],
        sandboxFactory?: (lib: SandboxLibrary) => Sandbox
    ) {
        super();
        this._localEvents = new Subject<LocalActions[]>();
        this._remoteEvents = new Subject<RemoteAction[]>();
        this._deviceEvents = new Subject<DeviceAction[]>();
        this._sandboxFactory = sandboxFactory;

        this._partitions = partitions;
        this._lib = createFormulaLibrary({ config });
    }

    /**
     * Gets the current local bot state.
     */
    get botsState(): AuxState {
        let state: AuxState = <AuxState>(
            getPartitionState(this._partitions['*'])
        );

        for (let key in this._partitions) {
            if (!this._partitions.hasOwnProperty(key)) {
                continue;
            }
            if (key !== '*') {
                const bot = <AuxBot>(
                    getPartitionState(this._partitions[key])[key]
                );
                if (bot) {
                    state[key] = bot;
                }
            }
        }

        return state;
    }

    get localEvents() {
        return this._localEvents;
    }

    get remoteEvents() {
        return this._remoteEvents;
    }

    get deviceEvents() {
        return this._deviceEvents;
    }

    /**
     * Creates a new BotCalculationContext from the current state.
     */
    createContext(): BotSandboxContext {
        return createCalculationContext(
            this.objects,
            this.userId,
            this._lib,
            this._sandboxFactory
        );
    }

    /**
     * Adds the given events in a transaction.
     * That is, they should be performed in a batch.
     * @param events The events to run.
     */
    async transaction(...events: BotAction[]): Promise<void> {
        const finalEvents = this._flattenEvents(events);
        await this._sendEvents(finalEvents);
        // await this._tree.addEvents(allNonRejected);
        // this._sendOtherEvents(allNonRejected);
    }

    /**
     * Creates a new bot with the given ID and tags. Returns the ID of the new bot.
     * @param id (Optional) The ID that the bot should have.
     * @param tags (Optional) The tags that the bot should have.
     */
    async createBot(id?: string, tags?: Bot['tags']): Promise<string> {
        if (AuxHelper._debug) {
            console.log('[AuxHelper] Create Bot');
        }

        const bot = createBot(id, tags);
        await this._sendEvents([botAdded(bot)]);
        // await this._tree.addBot(bot);

        return bot.id;
    }

    /**
     * Updates the given bot with the given data.
     * @param bot The bot.
     * @param newData The new data that the bot should have.
     */
    async updateBot(bot: AuxBot, newData: PartialBot): Promise<void> {
        updateBot(bot, this.userBot ? this.userBot.id : null, newData, () =>
            this.createContext()
        );

        await this._sendEvents([botUpdated(bot.id, newData)]);
        // await this._tree.updateBot(bot, newData);
    }

    /**
     * Creates a new globals bot.
     * @param botId The ID of the bot to create. If not specified a new ID will be generated.
     */
    async createGlobalsBot(botId?: string) {
        const workspace = createBot(botId, {});

        const final = merge(workspace, {
            tags: {
                'aux.version': AUX_BOT_VERSION,
                'aux.destroyable': false,
            },
        });

        await this._sendEvents([botAdded(final)]);
        // await this._tree.addBot(final);
    }

    /**
     * Creates or updates the user bot for the given user.
     * @param user The user that the bot is for.
     * @param userBot The bot to update. If null or undefined then a bot will be created.
     */
    async createOrUpdateUserBot(user: AuxUser, userBot: AuxBot) {
        const catchAllPartition = this._causalTreePartition;
        if (!catchAllPartition) {
            return;
        }

        const userContext = `_user_${user.username}_${
            catchAllPartition.tree.site.id
        }`;
        const userInventoryContext = `_user_${user.username}_inventory`;
        const userMenuContext = `_user_${user.username}_menu`;
        const userSimulationsContext = `_user_${user.username}_simulations`;
        if (!userBot) {
            await this.createBot(user.id, {
                [userContext]: true,
                ['aux.context']: userContext,
                ['aux.context.visualize']: true,
                ['aux._user']: user.username,
                ['aux._userInventoryContext']: userInventoryContext,
                ['aux._userMenuContext']: userMenuContext,
                ['aux._userSimulationsContext']: userSimulationsContext,
                'aux._mode': DEFAULT_USER_MODE,
            });
        } else {
            if (!userBot.tags['aux._userMenuContext']) {
                await this.updateBot(userBot, {
                    tags: {
                        ['aux._userMenuContext']: userMenuContext,
                    },
                });
            }
            if (!userBot.tags['aux._userInventoryContext']) {
                await this.updateBot(userBot, {
                    tags: {
                        ['aux._userInventoryContext']: userInventoryContext,
                    },
                });
            }
            if (!userBot.tags['aux._userSimulationsContext']) {
                await this.updateBot(userBot, {
                    tags: {
                        ['aux._userSimulationsContext']: userSimulationsContext,
                    },
                });
            }
        }
    }

    async formulaBatch(formulas: string[]): Promise<void> {
        const state = this.botsState;
        let events = flatMap(formulas, f =>
            calculateFormulaEvents(
                state,
                f,
                this.userId,
                undefined,
                this._sandboxFactory,
                this._lib
            )
        );
        await this.transaction(...events);
    }

    search(search: string) {
        return searchBotState(
            search,
            this.botsState,
            this.userId,
            this._lib,
            this._sandboxFactory
        );
    }

    getTags(): string[] {
        let objects = getActiveObjects(this.botsState);
        let allTags = union(...objects.map(o => tagsOnBot(o)));
        let sorted = sortBy(allTags, t => t);
        return sorted;
    }

    exportBots(botIds: string[]): StoredCausalTree<AuxOp> {
        const catchAllPartition = this._causalTreePartition;
        if (!catchAllPartition) {
            return null;
        }
        const tree = catchAllPartition.tree;
        const bots = botIds.map(id => <AuxBot>this.botsState[id]);
        const atoms = bots.map(f => f.metadata.ref);
        const weave = tree.weave.subweave(...atoms);
        const stored = storedTree(tree.site, tree.knownSites, weave.atoms);
        return stored;
    }

    private get _causalTreePartition() {
        const catchAllPartition = this._partitions['*'];
        if (catchAllPartition.type === 'causal_tree') {
            return catchAllPartition;
        } else {
            return null;
        }
    }

    private _flattenEvents(events: BotAction[]): BotAction[] {
        let resultEvents: BotAction[] = [];

        const filteredEvents = this._rejectEvents(events);

        for (let event of filteredEvents) {
            if (event.type === 'action') {
                const result = calculateActionEvents(
                    this.botsState,
                    event,
                    this._sandboxFactory,
                    this._lib
                );
                resultEvents.push(...this._flattenEvents(result.events));
            } else if (event.type === 'update_bot') {
                const bot = this.botsState[event.id];
                updateBot(bot, this.userBot.id, event.update, () =>
                    this.createContext()
                );
                resultEvents.push(event);
            } else if (event.type === 'paste_state') {
                resultEvents.push(...this._pasteState(event));
            } else {
                resultEvents.push(event);
            }
        }

        return resultEvents;
    }

    private _rejectEvents(events: BotAction[]): BotAction[] {
        const context = this.createContext();
        let resultEvents: BotAction[] = events.slice();
        for (let event of events) {
            const actions = this._allowEvent(context, event);
            resultEvents.push(...actions);
        }
        return resolveRejectedActions(resultEvents);
    }

    /**
     * Resolves the list of events through the onAnyAction() handler.
     * @param events The events to resolve.
     */
    public resolveEvents(events: BotAction[]): BotAction[] {
        return this._rejectEvents(events);
    }

    private _allowEvent(
        context: BotSandboxContext,
        event: BotAction
    ): BotAction[] {
        if (!this.globalsBot) {
            return [];
        }

        try {
            const [actions, results] = calculateActionResults(
                this.botsState,
                action(ON_ACTION_ACTION_NAME, [GLOBALS_BOT_ID], this.userId, {
                    action: event,
                }),
                undefined,
                context,
                false
            );

            if (results.length > 0) {
                return actions;
            }

            let defaultActions: BotAction[] = [];

            // default handler
            if (event.type === 'remove_bot') {
                if (event.id === GLOBALS_BOT_ID) {
                    defaultActions.push(reject(event));
                }
            }

            return defaultActions;
        } catch (err) {
            console.error(
                '[AuxHelper] The onAnyAction() handler errored:',
                err
            );
            return [];
        }
    }

    private async _sendEvents(events: BotAction[]) {
        let map = new Map<AuxPartition, BotAction[]>();
        for (let event of events) {
            const partition = this._partitionForEvent(event);
            if (typeof partition === 'undefined') {
                continue;
            }
            let batch = map.get(partition);
            if (!batch) {
                batch = [event];
                map.set(partition, batch);
            } else {
                batch.push(event);
            }
        }

        for (let [partition, batch] of map) {
            if (!partition) {
                continue;
            }

            const extra = await partition.applyEvents(batch);
            let nullBatch = map.get(null);
            if (!nullBatch) {
                nullBatch = [...extra];
                map.set(null, nullBatch);
            } else {
                nullBatch.push(...extra);
            }
        }

        let nullBatch = map.get(null);
        if (nullBatch) {
            this._sendOtherEvents(nullBatch);
        }
    }

    private _partitionForEvent(event: BotAction): AuxPartition {
        if (event.type === 'remote') {
            return null;
        } else if (event.type === 'device') {
            return null;
        } else if (event.type === 'add_bot') {
            return this._partitionForBotEvent(event);
        } else if (event.type === 'remove_bot') {
            return this._partitionForBotEvent(event);
        } else if (event.type === 'update_bot') {
            return this._partitionForBotEvent(event);
        } else if (event.type === 'apply_state') {
            return this._partitionForBotEvent(event);
        } else if (event.type === 'transaction') {
            return undefined;
        } else {
            return null;
        }
    }

    private _partitionForBotEvent(event: BotActions): AuxPartition {
        return this._partitionForBotId(this._botId(event));
    }

    private _partitionForBotId(id: string): AuxPartition {
        return this._partitions[id] || this._partitions['*'];
    }

    private _botId(event: BotActions): string {
        if (event.type === 'add_bot') {
            return event.bot.id;
        } else if (event.type === 'remove_bot') {
            return event.id;
        } else if (event.type === 'update_bot') {
            return event.id;
        } else {
            return '*';
        }
    }

    private _sendOtherEvents(events: BotAction[]) {
        let remoteEvents: RemoteAction[] = [];
        let localEvents: LocalActions[] = [];
        let deviceEvents: DeviceAction[] = [];

        for (let event of events) {
            if (event.type === 'remote') {
                remoteEvents.push(event);
            } else if (event.type === 'device') {
                deviceEvents.push(event);
            } else {
                localEvents.push(<LocalActions>event);
            }
        }

        if (localEvents.length > 0) {
            this._localEvents.next(localEvents);
        }
        if (remoteEvents.length > 0) {
            this._remoteEvents.next(remoteEvents);
        }
        if (deviceEvents.length > 0) {
            this._deviceEvents.next(deviceEvents);
        }
    }

    private _pasteState(event: PasteStateAction) {
        // TODO: Cleanup this function to make it easier to understand
        const value = event.state;
        const botIds = Object.keys(value);
        let state: BotsState = {};
        const oldBots = botIds.map(id => value[id]);
        const oldCalc = createCalculationContext(
            oldBots,
            this.userId,
            this._lib,
            this._sandboxFactory
        );
        const newCalc = this.createContext();

        if (event.options.context) {
            return this._pasteExistingWorksurface(
                oldBots,
                oldCalc,
                event,
                newCalc
            );
        } else {
            return this._pasteNewWorksurface(oldBots, oldCalc, event, newCalc);
        }
    }

    private _pasteExistingWorksurface(
        oldBots: Bot[],
        oldCalc: BotSandboxContext,
        event: PasteStateAction,
        newCalc: BotSandboxContext
    ) {
        let events: BotAction[] = [];

        // Preserve positions from old context
        for (let oldBot of oldBots) {
            const tags = tagsOnBot(oldBot);
            const tagsToRemove = filterWellKnownAndContextTags(newCalc, tags);
            const removedValues = tagsToRemove.map(t => [t, null]);
            let newBot = duplicateBot(oldCalc, oldBot, {
                tags: {
                    ...fromPairs(removedValues),
                    ...addToContextDiff(
                        newCalc,
                        event.options.context,
                        event.options.x,
                        event.options.y
                    ),
                    [`${event.options.context}.z`]: event.options.z,
                },
            });
            events.push(botAdded(cleanBot(newBot)));
        }

        return events;
    }

    private _pasteNewWorksurface(
        oldBots: Bot[],
        oldCalc: BotSandboxContext,
        event: PasteStateAction,
        newCalc: BotSandboxContext
    ) {
        const oldContextBots = oldBots.filter(
            f => getBotConfigContexts(oldCalc, f).length > 0
        );
        const oldContextBot =
            oldContextBots.length > 0 ? oldContextBots[0] : null;
        const oldContexts = oldContextBot
            ? getBotConfigContexts(oldCalc, oldContextBot)
            : [];
        let oldContext = oldContexts.length > 0 ? oldContexts[0] : null;
        let events: BotAction[] = [];
        const context = createContextId();
        let workspace: Bot;
        if (oldContextBot) {
            workspace = duplicateBot(oldCalc, oldContextBot, {
                tags: {
                    'aux.context': context,
                },
            });
        } else {
            workspace = createWorkspace(undefined, context);
        }
        workspace.tags['aux.context.x'] = event.options.x;
        workspace.tags['aux.context.y'] = event.options.y;
        workspace.tags['aux.context.z'] = event.options.z;
        events.push(botAdded(workspace));
        if (!oldContext) {
            oldContext = context;
        }

        // Preserve positions from old context
        for (let oldBot of oldBots) {
            if (oldContextBot && oldBot.id === oldContextBot.id) {
                continue;
            }
            const tags = tagsOnBot(oldBot);
            const tagsToRemove = filterWellKnownAndContextTags(newCalc, tags);
            const removedValues = tagsToRemove.map(t => [t, null]);
            let newBot = duplicateBot(oldCalc, oldBot, {
                tags: {
                    ...fromPairs(removedValues),
                    ...addToContextDiff(
                        newCalc,
                        context,
                        oldBot.tags[`${oldContext}.x`],
                        oldBot.tags[`${oldContext}.y`],
                        oldBot.tags[`${oldContext}.sortOrder`]
                    ),
                    [`${context}.z`]: oldBot.tags[`${oldContext}.z`],
                },
            });
            events.push(botAdded(cleanBot(newBot)));
        }
        return events;
    }
}
