import Component from 'vue-class-component';
import { Inject, Prop } from 'vue-property-decorator';

import PlayerApp from '../PlayerApp/PlayerApp';
import { IGameView } from '../../shared/vue-components/IGameView';
import MenuBot from '../MenuBot/MenuBot';
import { MenuItem } from '../MenuContext';
import BaseGameView from '../../shared/vue-components/BaseGameView';
import { PlayerGame } from '../scene/PlayerGame';
import { Game } from '../../shared/scene/Game';
import { map, tap, combineLatest } from 'rxjs/operators';

@Component({
    components: {
        'menu-bot': MenuBot,
    },
})
export default class PlayerGameView extends BaseGameView implements IGameView {
    _game: PlayerGame = null;
    menuExpanded: boolean = false;
    showInventoryCameraHome: boolean = false;
    inventoryViewportStyle: any = {};
    mainViewportStyle: any = {};

    hasMainViewport: boolean = false;
    hasInventoryViewport: boolean = false;
    menu: MenuItem[] = [];

    @Inject() addSidebarItem: PlayerApp['addSidebarItem'];
    @Inject() removeSidebarItem: PlayerApp['removeSidebarItem'];
    @Inject() removeSidebarGroup: PlayerApp['removeSidebarGroup'];
    @Prop() context: string;

    lastMenuCount: number = null;

    // TODO: Fix
    // get menu() {
    //     let items: MenuItem[] = [];
    //     this._game.playerSimulations.forEach(sim => {
    //         if (sim.menuContext) {
    //             items.push(...sim.menuContext.items);
    //         }
    //     });
    //     return items;
    // }

    constructor() {
        super();
    }

    protected createGame(): Game {
        return new PlayerGame(this);
    }

    moveTouch(e: TouchEvent) {
        e.preventDefault();
    }

    mouseDownSlider() {
        this._game.mouseDownSlider();
    }

    mouseUpSlider() {
        this._game.mouseUpSlider();
    }

    setupCore() {
        this.menu = [];
        this._subscriptions.push(
            this._game
                .watchCameraRigDistanceSquared(this._game.inventoryCameraRig)
                .pipe(
                    map(distSqr => distSqr >= 75),
                    tap(visible => (this.showInventoryCameraHome = visible))
                )
                .subscribe(),
            this._game.menuUpdated.subscribe(items => {
                this.menu.splice(0, this.menu.length, ...items);
                if (items.length <= 0) {
                    this.menuExpanded = false;
                }

                if (this.lastMenuCount === 0 && items.length > 0) {
                    this.menuExpanded = true;
                }

                this.lastMenuCount = items.length;
                console.log('items.length: ' + items.length);
            })
        );

        if (this._game.inventoryViewport) {
            this.hasInventoryViewport = true;

            let style = {
                bottom: this._game.inventoryViewport.y + 'px',
                left: this._game.inventoryViewport.x + 'px',
                width: this._game.inventoryViewport.width + 'px',
                height: this._game.inventoryViewport.height + 'px',
            };

            this.inventoryViewportStyle = style;

            this._subscriptions.push(
                this._game.inventoryViewport.onUpdated
                    .pipe(
                        map(viewport => ({
                            bottom: viewport.y + 'px',
                            left: viewport.x + 'px',
                            width: viewport.width + 'px',
                            height: viewport.height + 'px',
                        })),
                        tap(style => {
                            this.inventoryViewportStyle = style;
                        })
                    )
                    .subscribe()
            );
        }

        if (this._game.mainViewport && this._game.inventoryViewport) {
            this.hasMainViewport = true;
            this._subscriptions.push(
                this._game.mainViewport.onUpdated
                    .pipe(
                        combineLatest(
                            this._game.inventoryViewport.onUpdated,
                            (first, second) => ({
                                main: first,
                                inventory: second,
                            })
                        ),
                        map(({ main, inventory }) => ({
                            bottom: inventory.height + 'px',
                            left: main.x + 'px',
                            width: main.width + 'px',
                            height: main.height - inventory.height + 'px',
                        })),
                        tap(style => {
                            this.mainViewportStyle = style;
                        })
                    )
                    .subscribe()
            );
        }
    }

    centerInventoryCamera() {
        this._game.onCenterCamera(this._game.inventoryCameraRig);
    }
}
