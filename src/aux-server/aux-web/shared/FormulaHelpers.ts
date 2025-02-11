import {
    createFormulaLibrary,
    FormulaLibraryOptions,
} from '@casual-simulation/aux-common';
import { typeDefinitionMap } from '@casual-simulation/aux-common/Formulas/formula-lib';
import formulaDefinitions from 'raw-loader!@casual-simulation/aux-common/Formulas/formula-lib.d.ts';
import { keys } from 'lodash';

function typeMap(key: string, obj: any, root: string = ''): string {
    return `typeof _default['${key}']`;
}

/**
 * Calculates the typescript definitions for the formula library.
 * @param options The options to use for the library.
 */
export function calculateFormulaDefinitions(options?: FormulaLibraryOptions) {
    const formulaLib = createFormulaLibrary(options);
    const final =
        formulaDefinitions +
        [
            '\n',
            ...keys(formulaLib).map(
                k => `type _${k} = ${typeMap(k, formulaLib)};`
            ),
            'declare global {',
            ...keys(formulaLib).map(k => `  const ${k}: _${k};`),
            '}',
        ].join('\n');

    return final;
}
