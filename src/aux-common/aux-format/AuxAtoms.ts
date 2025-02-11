import { assign } from 'lodash';
import {
    RootOp,
    AuxOpBase,
    AuxOpType,
    BotOp,
    TagOp,
    ValueOp,
    AuxOp,
    InsertOp,
    DeleteOp,
} from './AuxOpTypes';

/**
 * Creates a root atom op.
 */
export function root(): RootOp {
    return op<RootOp>(AuxOpType.root, {});
}

/**
 * Creates a bot atom op.
 */
export function bot(id: string): BotOp {
    return op<BotOp>(AuxOpType.bot, {
        id,
    });
}

/**
 * Creates a tag atom op.
 */
export function tag(name: string): TagOp {
    return op<TagOp>(AuxOpType.tag, {
        name,
    });
}

/**
 * Creates a value op.
 * @param value The initial value for the tag.
 */
export function value(value: any): ValueOp {
    return op<ValueOp>(AuxOpType.value, {
        value,
    });
}

/**
 * Creates an insert op.
 * @param index The index to insert the text at.
 * @param text The text to insert.
 */
export function insert(index: number, text: string): InsertOp {
    return op<InsertOp>(AuxOpType.insert, {
        index,
        text,
    });
}

/**
 * Creates a delete op.
 * @param index The index to insert the text at.
 */
export function del(start?: number, end?: number): DeleteOp {
    return op<DeleteOp>(AuxOpType.delete, {
        start,
        end,
    });
}

export function op<T extends AuxOp>(type: T['type'], extra: Partial<T>): T {
    return <T>assign(
        {
            type: type,
            unix: Date.now(),
        },
        extra
    );
}
