import { LoadedChannel } from '@casual-simulation/causal-tree-server';
import {
    USERNAME_CLAIM,
    USER_ROLE,
    ADMIN_ROLE,
    DeviceInfo,
    RealtimeChannelInfo,
    SESSION_ID_CLAIM,
} from '@casual-simulation/causal-trees';
import {
    whitelistOrBlacklistAllowsAccess,
    Bot,
    GLOBALS_BOT_ID,
    getBotStringList,
    BotAction,
    isBotInContext,
    calculateBotValue,
    BotCalculationContext,
    calculateBooleanTagValue,
    parseRealtimeChannelId,
    getChannelMaxDevicesAllowed,
    getMaxDevicesAllowed,
} from '@casual-simulation/aux-common';
import { AuxLoadedChannel } from './AuxChannelManager';
import { AuxChannelAuthorizer } from './AuxChannelAuthorizer';
import { difference, intersection } from 'lodash';
import {
    of,
    Observable,
    Subscription,
    Subject,
    throwError,
    Observer,
    BehaviorSubject,
} from 'rxjs';
import { NodeSimulation } from './NodeSimulation';
import {
    map,
    filter,
    startWith,
    tap,
    distinctUntilChanged,
    combineLatest,
} from 'rxjs/operators';

export class AuxUserAuthorizer implements AuxChannelAuthorizer {
    private _sub: Subscription;
    private _adminChannel: AuxLoadedChannel;
    private _sim: NodeSimulation;

    private _botToChannelMap: Map<string, ChannelInfo>;
    private _channelMap: Map<string, ChannelInfo>;
    private _channelUpdated: Subject<string>;
    private _channelQueue: Map<string, string[]>;
    private _channelQueueUpdated: Subject<void>;
    private _globalQueueUpdated: Subject<void>;
    private _globalInfoUpdated: BehaviorSubject<void>;
    private _globalQueue: string[];
    private _globalInfo: GlobalInfo;

    constructor(adminChannel: AuxLoadedChannel) {
        this._adminChannel = adminChannel;
        this._sim = this._adminChannel.simulation;
        this._sub = new Subscription();
        this._botToChannelMap = new Map();
        this._channelMap = new Map();
        this._channelQueue = new Map();
        this._globalQueue = [];
        this._channelUpdated = new Subject<string>();
        this._channelQueueUpdated = new Subject<void>();
        this._globalQueueUpdated = new Subject<void>();
        this._globalInfoUpdated = new BehaviorSubject<void>(null);

        const context = this._sim.helper.createContext();
        const globals = this._sim.helper.globalsBot;
        this._globalInfo = this._calculateGlobal(context, globals);

        this._sub.add(
            this._sim.watcher.botsDiscovered
                .pipe(tap(bot => this._botsAdded(bot)))
                .subscribe()
        );

        this._sub.add(
            this._sim.watcher.botsRemoved
                .pipe(tap(bot => this._botsRemoved(bot)))
                .subscribe()
        );

        this._sub.add(
            this._sim.watcher.botsUpdated
                .pipe(tap(bot => this._botsUpdated(bot)))
                .subscribe()
        );
    }

    private _botsAdded(bots: Bot[]) {
        const context = this._sim.helper.createContext();

        for (let bot of bots) {
            if (bot.id === GLOBALS_BOT_ID) {
                this._globalInfo = this._calculateGlobal(context, bot);
                this._globalInfoUpdated.next();
            }

            if (isBotInContext(context, bot, 'aux.channels')) {
                const channel = this._calculateChannel(context, bot);
                if (channel.id) {
                    this._botToChannelMap.set(bot.id, channel);
                    this._channelMap.set(channel.id, channel);
                    this._channelUpdated.next(channel.id);
                }
            }
        }
    }

    private _botsRemoved(ids: string[]) {
        for (let id of ids) {
            const channel = this._botToChannelMap.get(id);
            if (channel) {
                this._botToChannelMap.delete(id);
                this._channelMap.delete(channel.id);
                this._channelUpdated.next(channel.id);
            }
        }
    }

    private _botsUpdated(bots: Bot[]) {
        const context = this._sim.helper.createContext();

        for (let bot of bots) {
            if (bot.id === GLOBALS_BOT_ID) {
                this._globalInfo = this._calculateGlobal(context, bot);
                this._globalInfoUpdated.next();
            }

            if (isBotInContext(context, bot, 'aux.channels')) {
                const channel = this._botToChannelMap.get(bot.id);
                if (channel) {
                    this._botToChannelMap.delete(bot.id);
                    this._channelMap.delete(channel.id);
                }

                const newChannel = this._calculateChannel(context, bot);
                if (newChannel.id) {
                    this._botToChannelMap.set(bot.id, newChannel);
                    this._channelMap.set(newChannel.id, newChannel);
                }

                if (!channel || newChannel.id === channel.id) {
                    this._channelUpdated.next(newChannel.id);
                } else {
                    this._channelUpdated.next(channel.id);
                    this._channelUpdated.next(newChannel.id);
                }
            } else {
                const channel = this._botToChannelMap.get(bot.id);
                if (channel) {
                    this._botToChannelMap.delete(bot.id);
                    this._channelMap.delete(channel.id);
                    this._channelUpdated.next(channel.id);
                }
            }
        }
    }

    private _calculateChannel(
        context: BotCalculationContext,
        bot: Bot
    ): ChannelInfo {
        let channelId = calculateBotValue(context, bot, 'aux.channel');

        if (channelId === undefined) {
            return {
                id: undefined,
                locked: calculateBooleanTagValue(
                    context,
                    bot,
                    'aux.channel.locked',
                    false
                ),
                maxUsers: getChannelMaxDevicesAllowed(context, bot),
            };
        }

        return {
            id: calculateBotValue(context, bot, 'aux.channel').toString(),
            locked: calculateBooleanTagValue(
                context,
                bot,
                'aux.channel.locked',
                false
            ),
            maxUsers: getChannelMaxDevicesAllowed(context, bot),
        };
    }

    private _calculateGlobal(
        context: BotCalculationContext,
        bot: Bot
    ): GlobalInfo {
        return {
            maxUsers: getMaxDevicesAllowed(context, bot),
        };
    }

    isAllowedToLoad(
        device: DeviceInfo,
        info: RealtimeChannelInfo
    ): Observable<boolean> {
        if (info.id === 'aux-admin') {
            return of(true);
        }
        let channelId = parseRealtimeChannelId(info.id);
        let channels = this._channelUpdated.pipe(
            startWith(channelId),
            filter(id => id === channelId),
            map(id => this._channelMap.get(id)),
            map(channel => !!(channel && !channel.locked)),
            distinctUntilChanged()
        );

        return channels;
    }

    isAllowedAccess(
        device: DeviceInfo,
        channel: LoadedChannel
    ): Observable<boolean> {
        if (channel.info.type !== 'aux') {
            return throwError(new Error('Channel type must be "aux"'));
        }

        if (!device) {
            return of(false);
        }

        if (this._isAdmin(device)) {
            return of(true);
        }

        if (!this._isUser(device)) {
            return of(false);
        }

        const channelId = parseRealtimeChannelId(channel.info.id);

        console.log('Session ID', device.claims[SESSION_ID_CLAIM]);
        return this._channelUpdated.pipe(
            startWith(channelId),
            combineLatest(
                this._channelQueuePosition(device, channelId),
                this._globalQueuePosition(device),
                this._globalInfoUpdated,
                (channelId, channelIndex, globalIndex) => ({
                    channelId,
                    channelIndex,
                    globalIndex,
                })
            ),
            filter(({ channelId: id }) => id === channelId),
            map(({ channelId: id, ...other }) => ({
                info: this._channelMap.get(id),
                ...other,
            })),
            map(({ info, channelIndex, globalIndex }) =>
                this._channelAllowsAccess(
                    device,
                    info,
                    channel,
                    channelIndex,
                    globalIndex
                )
            ),
            distinctUntilChanged()
        );
    }

    canProcessEvent(device: DeviceInfo, event: BotAction): boolean {
        return this._isAdmin(device);
    }

    private _isAdmin(device: DeviceInfo) {
        return device.roles.indexOf(ADMIN_ROLE) >= 0;
    }

    private _isUser(device: DeviceInfo) {
        return device.roles.indexOf(USER_ROLE) >= 0;
    }

    private _channelQueuePosition(
        device: DeviceInfo,
        id: string
    ): Observable<number> {
        let queue = this._channelQueue.get(id);
        if (!queue) {
            queue = [];
            this._channelQueue.set(id, queue);
        }

        const sessionId = device.claims[SESSION_ID_CLAIM];
        let index = queue.indexOf(sessionId);
        if (index < 0) {
            index = queue.length;
            queue.push(sessionId);
        }

        return Observable.create((observer: Observer<number>) => {
            observer.next(index);

            const sub = this._channelQueueUpdated.subscribe(() => {
                let index = queue.indexOf(sessionId);
                observer.next(index);
            });

            sub.add(() => {
                let index = queue.indexOf(sessionId);
                if (index >= 0) {
                    queue.splice(index, 1);
                    this._channelQueueUpdated.next();
                }
            });

            return sub;
        });
    }

    private _globalQueuePosition(device: DeviceInfo): Observable<number> {
        let queue = this._globalQueue;

        const sessionId = device.claims[SESSION_ID_CLAIM];
        let index = queue.indexOf(sessionId);
        if (index < 0) {
            index = queue.length;
            queue.push(sessionId);
        }

        return Observable.create((observer: Observer<number>) => {
            observer.next(index);

            const sub = this._globalQueueUpdated.subscribe(() => {
                let index = queue.indexOf(sessionId);
                observer.next(index);
            });

            sub.add(() => {
                let index = queue.indexOf(sessionId);
                if (index >= 0) {
                    queue.splice(index, 1);
                    this._globalQueueUpdated.next();
                }
            });

            return sub;
        });
    }

    private _channelAllowsAccess(
        device: DeviceInfo,
        channelInfo: ChannelInfo,
        channel: LoadedChannel,
        channelIndex: number,
        globalIndex: number
    ): boolean {
        if (
            this._globalInfo.maxUsers !== null &&
            globalIndex + 1 > this._globalInfo.maxUsers
        ) {
            return false;
        }

        if (channelInfo) {
            if (
                channelInfo.maxUsers !== null &&
                channelIndex + 1 > channelInfo.maxUsers
            ) {
                return false;
            }
        } else {
            console.warn(
                '[AuxUserAuthorizer] Not checking channel session limits because there is no bot for the channel.'
            );
        }

        const sim = <AuxLoadedChannel>channel;
        const calc = sim.simulation.helper.createContext();

        const globalsBot: Bot = sim.tree.value[GLOBALS_BOT_ID];
        const username = device.claims[USERNAME_CLAIM];

        if (!globalsBot) {
            return true;
        }

        if (!whitelistOrBlacklistAllowsAccess(calc, globalsBot, username)) {
            return false;
        }

        const whitelist =
            getBotStringList(calc, globalsBot, 'aux.whitelist.roles') || [];
        const blacklist =
            getBotStringList(calc, globalsBot, 'aux.blacklist.roles') || [];

        const missingRoles = difference(whitelist, device.roles);
        if (missingRoles.length > 0) {
            return false;
        }

        const bannedRoles = intersection(blacklist, device.roles);
        if (bannedRoles.length > 0) {
            return false;
        }

        return true;
    }
}

interface ChannelInfo {
    id: string;
    locked: boolean;
    maxUsers: number;
}

interface GlobalInfo {
    maxUsers: number;
}
