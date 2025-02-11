import {
    BotCalculationContext,
    isContext,
    getContextVisualizeMode,
    getContextPosition,
    getContextScale,
    getContextSize,
} from '@casual-simulation/aux-common';
import {
    hexesInRadius,
    realPosToGridPos,
    Axial,
    posToKey,
    hexRing,
} from './scene/hex';
import { flatMap } from 'lodash';
import { Vector2 } from 'three';

export function nextAvailableWorkspacePosition(calc: BotCalculationContext) {
    const visibleWorkspacePositions = flatMap(
        calc.objects.filter(
            f =>
                isContext(calc, f) &&
                getContextVisualizeMode(calc, f) === 'surface'
        ),
        f => {
            const position = getContextPosition(calc, f);
            const scale = getContextScale(calc, f);
            const positions = hexesInRadius(getContextSize(calc, f));
            const centerPosition = realPosToGridPos(
                new Vector2(position.x, position.y),
                scale
            );

            return positions.map(hex => {
                return new Axial(
                    hex.q + centerPosition.q,
                    hex.r + centerPosition.r
                );
            });
        }
    );

    const mappedPositions = new Map<string, Axial>();

    for (let pos of visibleWorkspacePositions) {
        mappedPositions.set(posToKey(pos), pos);
    }

    let radius = 1;
    let nextPosition: Axial = null;
    while (!nextPosition) {
        const positions = hexRing(radius);
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            if (!mappedPositions.has(posToKey(pos))) {
                nextPosition = pos;
                break;
            }
        }

        radius += 1;
    }

    return nextPosition;
}
