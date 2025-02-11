import {
    Atom,
    PrecalculatedOp,
    precalculatedOp,
    Weave,
} from '@casual-simulation/causal-trees';
import { AuxBot, AuxTagMetadata } from './AuxState';
import {
    InsertOp,
    DeleteOp,
    AuxOp,
    AuxOpType,
    BotOp,
    TagOp,
} from './AuxOpTypes';
import { calculateSequenceRef, calculateSequenceRefs } from './AuxReducer';
import { insert, del } from './AuxAtoms';
import { botAdded, botRemoved, botUpdated, BotAction } from '../bots/BotEvents';
import { createBot } from '../bots/BotCalculations';
import { AuxCausalTree } from './AuxCausalTree';

/**
 * Gets the Bot Atom that the given atom is childed under.
 */
export function getAtomTag(weave: Weave<AuxOp>, ref: Atom<AuxOp>): Atom<TagOp> {
    if (ref.value.type === AuxOpType.tag) {
        return <Atom<TagOp>>ref;
    }
    if (!ref.cause) {
        return null;
    }
    const cause = weave.getAtom(ref.cause);
    return getAtomTag(weave, cause);
}

/**
 * Gets the Bot Atom that the given atom is childed under.
 */
export function getAtomBot(weave: Weave<AuxOp>, ref: Atom<AuxOp>): Atom<BotOp> {
    if (!ref) {
        return null;
    }
    if (ref.value.type === AuxOpType.bot) {
        return <Atom<BotOp>>ref;
    }
    if (!ref.cause) {
        return null;
    }
    const cause = weave.getAtom(ref.cause);
    return getAtomBot(weave, cause);
}

/**
 * Gets the metadata for the given tag.
 * If the tag does not exist, then null is returned.
 * @param bot The bot that the metadata should come from.
 * @param tag The name of the tag.
 */
export function getTagMetadata(bot: AuxBot, tag: string): AuxTagMetadata {
    if (bot && bot.metadata && bot.metadata.tags[tag]) {
        return bot.metadata.tags[tag];
    } else {
        return null;
    }
}

/**
 * Inserts the given text into the given tag or value on the given bot.
 * @param bot The bot that the text should be inserted into.
 * @param tag The tag that the text should be inserted into.
 * @param text The text that should be inserted.
 * @param index The index that the text should be inserted at.
 */
export function insertIntoTagValue(
    bot: AuxBot,
    tag: string,
    text: string,
    index: number
): PrecalculatedOp<InsertOp> {
    const tagMeta = getTagMetadata(bot, tag);
    if (tagMeta) {
        const result = calculateSequenceRef(tagMeta.value.sequence, index);
        return precalculatedOp(insert(result.index, text), result.ref);
    } else {
        return null;
    }
}

/**
 * Inserts the given text into the given tag name.
 * Note that after inserting the text the tag name will change.
 * @param tag The tag whose name should be updated.
 * @param text The text to insert into the tag name.
 * @param index The index that the text should be inserted at.
 */
export function insertIntoTagName(
    bot: AuxBot,
    tag: string,
    text: string,
    index: number
): PrecalculatedOp<InsertOp> {
    const tagMeta = getTagMetadata(bot, tag);
    if (tagMeta) {
        const result = calculateSequenceRef(tagMeta.name, index);
        return precalculatedOp(insert(result.index, text), result.ref);
    } else {
        return null;
    }
}

/**
 * Deletes a segment of text from the given tag's value.
 * @param bot The bot that the text should be deleted from.
 * @param tag The tag that the text should be deleted from.
 * @param index The index that the text should be deleted at.
 * @param length The number of characters to delete.
 */
export function deleteFromTagValue(
    bot: AuxBot,
    tag: string,
    index: number,
    length: number
): PrecalculatedOp<DeleteOp>[] {
    const tagMeta = getTagMetadata(bot, tag);
    if (tagMeta) {
        const result = calculateSequenceRefs(
            tagMeta.value.sequence,
            index,
            length
        );
        return result.map(r =>
            precalculatedOp(del(r.index, r.index + r.length), r.ref, 1)
        );
    } else {
        return null;
    }
}

/**
 * Deletes a segment of text from the given tag's name.
 * Note that after inserting the text the tag name will change.
 * @param tag The tag whose name should be updated.
 * @param index The index that the characters should be deleted from.
 * @param length The number of characters to delete.
 */
export function deleteFromTagName(
    bot: AuxBot,
    tag: string,
    index: number,
    length: number
): PrecalculatedOp<DeleteOp>[] {
    const tagMeta = getTagMetadata(bot, tag);
    if (tagMeta) {
        const result = calculateSequenceRefs(tagMeta.name, index);
        return result.map(r =>
            precalculatedOp(del(r.index, r.index + r.length), r.ref, 1)
        );
    } else {
        return null;
    }
}

export function atomToEvent(atom: Atom<AuxOp>, tree: AuxCausalTree): BotAction {
    const value = atom.value;
    if (value.type === AuxOpType.bot) {
        return botAdded(createBot(value.id));
    } else if (value.type === AuxOpType.delete) {
        const cause = tree.weave.getAtom(atom.cause);
        if (cause.value.type === AuxOpType.bot) {
            return botRemoved(cause.value.id);
        }
    } else if (value.type === AuxOpType.tag) {
        return null;
    }

    // Some other update
    const bot = getAtomBot(tree.weave, atom);
    if (!bot) {
        return null;
    }

    const tag = getAtomTag(tree.weave, atom);
    if (!tag) {
        return null;
    }

    if (value.type === AuxOpType.value) {
        return botUpdated(bot.value.id, {
            tags: {
                [tag.value.name]: value.value,
            },
        });
    }

    if (value.type === AuxOpType.delete) {
        return botUpdated(bot.value.id, {
            tags: {
                [tag.value.name]: null,
            },
        });
    }

    return null;
}
