import { AuxBot3DDecorator } from '../AuxBot3DDecorator';
import { AuxBot3D } from '../AuxBot3D';
import {
    BotCalculationContext,
    calculateBotValue,
    getBotShape,
    BotShape,
} from '@casual-simulation/aux-common';
import {
    Mesh,
    MeshStandardMaterial,
    Color,
    LineSegments,
    LineBasicMaterial,
    Group,
    Vector3,
    MeshToonMaterial,
    Sprite,
} from 'three';
import {
    createCube,
    createCubeStrokeGeometry,
    isTransparent,
    disposeMesh,
    createSphere,
    createSprite,
} from '../SceneUtils';
import { IMeshDecorator } from './IMeshDecorator';
import { ArgEvent } from '@casual-simulation/aux-common/Events';

export class BotShapeDecorator extends AuxBot3DDecorator
    implements IMeshDecorator {
    private _shape: BotShape = null;

    container: Group;
    mesh: Mesh | Sprite;

    /**
     * The optional stroke outline for the bot.
     */
    stroke: LineSegments;

    onMeshUpdated: ArgEvent<IMeshDecorator> = new ArgEvent<IMeshDecorator>();

    constructor(bot3D: AuxBot3D) {
        super(bot3D);

        this._rebuildShape('cube');
    }

    botUpdated(calc: BotCalculationContext): void {
        const shape = getBotShape(calc, this.bot3D.bot);
        if (this._shape !== shape) {
            this._rebuildShape(shape);
        }

        this._updateColor(calc);
        this._updateStroke(calc);
    }

    private _updateStroke(calc: BotCalculationContext) {
        if (!this.stroke) {
            return;
        }

        this.stroke.visible = true;
        const strokeColorValue = calculateBotValue(
            calc,
            this.bot3D.bot,
            'aux.stroke.color'
        );
        const strokeWidth: number = calculateBotValue(
            calc,
            this.bot3D.bot,
            'aux.stroke.width'
        );
        const strokeMat = <LineBasicMaterial>this.stroke.material;
        if (typeof strokeColorValue !== 'undefined') {
            strokeMat.visible = !isTransparent(strokeColorValue);
            if (strokeMat.visible) {
                strokeMat.color = new Color(strokeColorValue);
            }
        } else {
            strokeMat.visible = false;
        }
        if (typeof strokeWidth !== 'undefined') {
            strokeMat.linewidth = strokeWidth;
        } else {
            strokeMat.linewidth = 1;
        }
    }

    frameUpdate(calc: BotCalculationContext): void {}

    dispose(): void {
        const index = this.bot3D.colliders.indexOf(this.mesh);
        if (index >= 0) {
            this.bot3D.colliders.splice(index, 1);
        }

        this.bot3D.display.remove(this.container);
        disposeMesh(this.mesh);
        disposeMesh(this.stroke);

        this.mesh = null;
        this.container = null;
        this.stroke = null;
    }

    private _updateColor(calc: BotCalculationContext) {
        let color: any = null;
        if (this.bot3D.bot.tags['aux.color']) {
            color = calculateBotValue(calc, this.bot3D.bot, 'aux.color');
        }

        this._setColor(color);
    }

    private _setColor(color: any) {
        const shapeMat = <MeshStandardMaterial | MeshToonMaterial>(
            this.mesh.material
        );
        if (color) {
            shapeMat.visible = !isTransparent(color);
            if (shapeMat.visible) {
                shapeMat.color = new Color(color);
            }
        } else {
            shapeMat.visible = true;
            shapeMat.color = new Color(0xffffff);
        }
    }

    private _rebuildShape(shape: BotShape) {
        this._shape = shape;
        if (this.mesh) {
            this.dispose();
        }

        // Container
        this.container = new Group();
        this.container.position.set(0, 0.5, 0);
        this.bot3D.display.add(this.container);

        if (this._shape === 'cube') {
            // Cube Mesh
            this.mesh = createCube(1);
            this.container.add(this.mesh);
            this.bot3D.colliders.push(this.mesh);

            // Stroke
            const geo = createCubeStrokeGeometry();
            const material = new LineBasicMaterial({
                color: 0x000000,
            });

            this.stroke = new LineSegments(geo, material);
            this.container.add(this.stroke);
        } else if (this._shape === 'sphere') {
            // Sphere Mesh
            this.mesh = createSphere(new Vector3(0, 0, 0), 0x000000, 0.5);
            this.container.add(this.mesh);
            this.bot3D.colliders.push(this.mesh);

            this.stroke = null;
        } else if (this._shape === 'sprite') {
            // Sprite Mesh
            this.mesh = createSprite();
            this.container.add(this.mesh);
            this.bot3D.colliders.push(this.mesh);

            this.stroke = null;
        }

        this.onMeshUpdated.invoke(this);
    }
}
