import { BaseBotClickOperation } from '../../../shared/interaction/ClickOperation/BaseBotClickOperation';
import PlayerGameView from '../../PlayerGameView/PlayerGameView';
import { AuxBot3D } from '../../../shared/scene/AuxBot3D';
import { Intersection, Vector2 } from 'three';
import { PlayerInteractionManager } from '../PlayerInteractionManager';
import {
    BotCalculationContext,
    getBotPosition,
    objectsAtContextGridPosition,
    getBotIndex,
    duplicateBot,
    Bot,
    getBotDragMode,
    tagsOnBot,
} from '@casual-simulation/aux-common';
import { BaseBotDragOperation } from '../../../shared/interaction/DragOperation/BaseBotDragOperation';
import { PlayerBotDragOperation } from '../DragOperation/PlayerBotDragOperation';
import { dropWhile } from 'lodash';
import { PlayerSimulation3D } from '../../scene/PlayerSimulation3D';
import { PlayerNewBotDragOperation } from '../DragOperation/PlayerNewBotDragOperation';
import { InventorySimulation3D } from '../../scene/InventorySimulation3D';
import { Simulation3D } from '../../../shared/scene/Simulation3D';
import { PlayerGame } from '../../scene/PlayerGame';
import { VRController3D } from '../../../shared/scene/vr/VRController3D';

export class PlayerBotClickOperation extends BaseBotClickOperation {
    // This overrides the base class.
    protected _interaction: PlayerInteractionManager;

    protected faceClicked: { face: string; context: string };

    constructor(
        simulation3D: Simulation3D,
        interaction: PlayerInteractionManager,
        bot: AuxBot3D,
        faceValue: string,
        vrController: VRController3D | null
    ) {
        super(simulation3D, interaction, bot.bot, bot, vrController);

        this.faceClicked = { face: faceValue, context: null };
    }

    protected _performClick(calc: BotCalculationContext): void {
        const bot3D: AuxBot3D = <AuxBot3D>this._bot3D;

        this.faceClicked.context = bot3D.context;

        this.simulation.helper.action('onClick', [this._bot], this.faceClicked);

        this.simulation.helper.action('onAnyBotClicked', null, {
            face: this.faceClicked.face,
            bot: this._bot,
            context: bot3D.context,
        });
    }

    protected _createDragOperation(
        calc: BotCalculationContext,
        fromCoord?: Vector2
    ): BaseBotDragOperation {
        const mode = getBotDragMode(calc, this._bot);
        if (mode === 'clone') {
            return this._createCloneDragOperation(calc);
        } else if (mode === 'mod') {
            return this._createDiffDragOperation(calc);
        }

        const bot3D: AuxBot3D = <AuxBot3D>this._bot3D;
        const context = bot3D.context;
        const position = getBotPosition(calc, bot3D.bot, context);
        if (position) {
            const objects = objectsAtContextGridPosition(
                calc,
                context,
                position
            );
            if (objects.length === 0) {
                console.log('Found no objects at', position);
                console.log(bot3D.bot);
                console.log(context);
            }
            const bot = this._bot;
            const draggedObjects = dropWhile(objects, o => o.id !== bot.id);
            const {
                playerSimulation3D,
                inventorySimulation3D,
            } = this._getSimulationsForDragOp();

            return new PlayerBotDragOperation(
                playerSimulation3D,
                inventorySimulation3D,
                this._interaction,
                draggedObjects,
                bot3D.context,
                this._vrController,
                fromCoord
            );
        }

        return null;
    }

    protected _createCloneDragOperation(
        calc: BotCalculationContext
    ): BaseBotDragOperation {
        let duplicatedBot = duplicateBot(calc, <Bot>this._bot);
        const {
            playerSimulation3D,
            inventorySimulation3D,
        } = this._getSimulationsForDragOp();
        return new PlayerNewBotDragOperation(
            playerSimulation3D,
            inventorySimulation3D,
            this._interaction,
            duplicatedBot,
            (<AuxBot3D>this._bot3D).context,
            this._vrController
        );
    }

    protected _createDiffDragOperation(
        calc: BotCalculationContext
    ): BaseBotDragOperation {
        const tags = tagsOnBot(this._bot);
        let duplicatedBot = duplicateBot(calc, <Bot>this._bot, {
            tags: {
                'aux.mod': true,
                'aux.mod.mergeTags': tags,
            },
        });
        const {
            playerSimulation3D,
            inventorySimulation3D,
        } = this._getSimulationsForDragOp();
        return new PlayerNewBotDragOperation(
            playerSimulation3D,
            inventorySimulation3D,
            this._interaction,
            duplicatedBot,
            (<AuxBot3D>this._bot3D).context,
            this._vrController
        );
    }

    private _getSimulationsForDragOp() {
        let playerSimulation3D: PlayerSimulation3D;
        let inventorySimulation3D: InventorySimulation3D;

        if (this._simulation3D instanceof PlayerSimulation3D) {
            playerSimulation3D = this._simulation3D;
            inventorySimulation3D = (<PlayerGame>(
                this.game
            )).findInventorySimulation3D(this._simulation3D.simulation);
        } else if (this._simulation3D instanceof InventorySimulation3D) {
            playerSimulation3D = (<PlayerGame>this.game).findPlayerSimulation3D(
                this._simulation3D.simulation
            );
            inventorySimulation3D = this._simulation3D;
        } else {
            console.error(
                '[PlayerBotClickOperation] Unsupported Simulation3D type for drag operation.'
            );
        }

        return { playerSimulation3D, inventorySimulation3D };
    }
}
