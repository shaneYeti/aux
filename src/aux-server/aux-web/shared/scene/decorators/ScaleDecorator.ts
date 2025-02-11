import { AuxBot3DDecorator } from '../AuxBot3DDecorator';
import { AuxBot3D } from '../AuxBot3D';
import {
    BotCalculationContext,
    calculateGridScale,
    getBuilderContextGrid,
    DEFAULT_WORKSPACE_GRID_SCALE,
} from '@casual-simulation/aux-common';
import { Text3D } from '../Text3D';
import { calculateScale } from '../SceneUtils';

export class ScaleDecorator extends AuxBot3DDecorator {
    constructor(bot3D: AuxBot3D) {
        super(bot3D);
    }

    botUpdated(calc: BotCalculationContext): void {
        const gridScale = calculateGridScale(
            calc,
            this.bot3D.contextGroup ? this.bot3D.contextGroup.bot : null
        );
        const scale = calculateScale(calc, this.bot3D.bot, gridScale);
        this.bot3D.display.scale.set(scale.x, scale.y, scale.z);
    }

    frameUpdate(calc: BotCalculationContext): void {}

    dispose(): void {}
}
