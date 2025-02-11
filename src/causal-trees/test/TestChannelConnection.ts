import { Observable, Subject, Observer } from 'rxjs';
import { RealtimeChannelConnection } from '../core/RealtimeChannelConnection';
import { ConnectionEvent } from '../core/ConnectionEvent';
import { Atom, AtomOp } from '../core/Atom';
import { RealtimeChannelResult } from '../core/RealtimeChannelResult';
import { RealtimeChannelInfo } from '../core/RealtimeChannelInfo';
import { SiteInfo } from '../core/SiteIdInfo';
import { StoredCausalTree } from '../core/StoredCausalTree';
import { SiteVersionInfo } from '../core/SiteVersionInfo';
import { DeviceInfo } from '../core/DeviceInfo';
import { DeviceToken } from '../core/User';
import { DeviceAction, Action } from '../core/Event';

export interface TestChannelRequest {
    name: string;
    data: any;
    resolve: (response: any) => void;
    reject: (err: any) => void;
}

export class TestChannelConnection implements RealtimeChannelConnection {
    info: RealtimeChannelInfo;
    sites: Subject<SiteInfo>;
    events: Subject<DeviceAction[]>;

    login(user: DeviceToken): Observable<RealtimeChannelResult<DeviceInfo>> {
        return this._requestObservable('login', user);
    }

    joinChannel(): Observable<RealtimeChannelResult<void>> {
        return this._requestObservable('join_channel', this.info);
    }

    exchangeInfo(
        version: SiteVersionInfo
    ): Promise<RealtimeChannelResult<SiteVersionInfo>> {
        return this._request(`info_${this.info.id}`, version);
    }

    requestSiteId(site: SiteInfo): Promise<RealtimeChannelResult<boolean>> {
        return this._request(`siteId_${this.info.id}`, site);
    }

    exchangeWeaves<T extends AtomOp>(
        message: StoredCausalTree<T>
    ): Promise<RealtimeChannelResult<StoredCausalTree<T>>> {
        return this._request(`weave_${this.info.id}`, message);
    }

    private _connectionStateChanged: Subject<boolean>;
    atoms: Subject<Atom<AtomOp>[]>;
    emitted: Atom<AtomOp>[][];
    requests: TestChannelRequest[];
    flush: boolean;
    resolve: (name: string, data: any) => any;

    initialized: boolean = false;

    _connected: boolean;
    closed: boolean;

    constructor(info: RealtimeChannelInfo) {
        this.info = info;
        this._connectionStateChanged = new Subject<boolean>();
        this.atoms = new Subject<Atom<AtomOp>[]>();
        this.sites = new Subject<SiteInfo>();
        this.emitted = [];
        this.requests = [];
        this._connected = null;
        this.closed = false;
        this.flush = false;
        this.resolve = null;
    }

    get connected() {
        return this._connected || false;
    }

    setConnected(value: boolean) {
        if (value !== this._connected) {
            this._connected = value;
            this._connectionStateChanged.next(this._connected);
        }
    }

    connect(): void {
        this.initialized = true;
    }

    isConnected(): boolean {
        return this._connected;
    }

    async emit(event: Atom<AtomOp>[]): Promise<RealtimeChannelResult<void>> {
        this.emitted.push(event);
        return this._request<RealtimeChannelResult<void>>(
            `event_${this.info.id}`,
            event
        );
    }

    async sendEvents(events: Action[]): Promise<void> {}

    _request<TResponse>(name: string, data: any): Promise<TResponse> {
        return new Promise((resolve, reject) => {
            if (this.resolve) {
                this.flush = true;
                resolve(this.resolve(name, data));
            } else {
                this.requests.push({
                    name,
                    data,
                    resolve,
                    reject,
                });
            }
        });
    }

    _requestObservable(name: string, data: any): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            if (this.resolve) {
                this.flush = true;
                observer.next(this.resolve(name, data));
            } else {
                this.requests.push({
                    name,
                    data,
                    resolve: result => observer.next(result),
                    reject: err => observer.error(err),
                });
            }
        });
    }

    get connectionStateChanged() {
        return this._connectionStateChanged;
    }

    unsubscribe(): void {
        this.closed = true;
    }

    async flushPromise() {
        this.flush = false;
        await Promise.resolve();
    }

    async flushPromises() {
        // Resolve all the pending promises
        while (this.flush) {
            await this.flushPromise();
        }

        for (let i = 0; i < 10; i++) {
            await this.flushPromise();
        }
    }
}
