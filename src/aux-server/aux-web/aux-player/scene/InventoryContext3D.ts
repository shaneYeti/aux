import { Object3D } from 'three';
import { ContextGroup3D } from '../../shared/scene/ContextGroup3D';
import {
    AuxDomain,
    AuxBot,
    BotCalculationContext,
    isBotInContext,
} from '@casual-simulation/aux-common';
import { AuxBot3DDecoratorFactory } from '../../shared/scene/decorators/AuxBot3DDecoratorFactory';
import { Context3D } from '../../shared/scene/Context3D';
import { InventoryContextGroup3D } from './InventoryContextGroup3D';

export const DEFAULT_INVENTORY_SLOTGRID_WIDTH = 5;
export const DEFAULT_INVENTORY_SLOTGRID_HEIGHT = 3;

export class InventoryContext3D extends Context3D {
    contextGroup: InventoryContextGroup3D;

    /**
     * Creates a new context which represents a grouping of bots.
     * This is a special Context3D designed for Inventory contexts which has
     * some special cases.
     * @param context The tag that this context represents.
     * @param colliders The array that new colliders should be added to.
     */
    constructor(
        context: string,
        group: InventoryContextGroup3D,
        domain: AuxDomain,
        colliders: Object3D[],
        decoratorFactory: AuxBot3DDecoratorFactory
    ) {
        super(context, group, domain, colliders, decoratorFactory);
    }

    /**
     * Notifies this context that the given bot was added to the state.
     * @param bot The bot.
     * @param calc The calculation context that should be used.
     */
    botAdded(bot: AuxBot, calc: BotCalculationContext) {
        super.botAdded(bot, calc);
    }

    // private _doesBotFitInGridSlots(
    //     bot: AuxBot,
    //     calc: BotCalculationContext
    // ): boolean {
    //     const contextPos = getBotPosition(calc, bot, this.context);

    //     if (contextPos.x < 0 || contextPos.x >= this._gridSlotsWidth)
    //         return false;
    //     if (contextPos.y < 0 || contextPos.y >= this._gridSlotsHeight)
    //         return false;

    //     return true;
    // }
}
