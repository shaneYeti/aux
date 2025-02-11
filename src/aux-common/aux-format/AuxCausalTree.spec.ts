import { AuxCausalTree } from './AuxCausalTree';
import { AuxOp, AuxOpType } from './AuxOpTypes';
import {
    DEFAULT_WORKSPACE_SCALE,
    DEFAULT_WORKSPACE_HEIGHT,
    DEFAULT_WORKSPACE_GRID_SCALE,
    DEFAULT_WORKSPACE_COLOR,
    createBot,
    createWorkspace,
    botUpdated,
    botAdded,
    botRemoved,
    transaction,
    addState,
    Bot,
} from '../bots';
import {
    storedTree,
    site,
    atomId,
    atom,
    Atom,
    AtomFactory,
} from '@casual-simulation/causal-trees';
import { AuxState } from './AuxState';
import { bot, tag, value, del, insert } from './AuxAtoms';

Date.now = jest.fn();

describe('AuxCausalTree', () => {
    describe('value', () => {
        describe('calculations', () => {
            it('should add bots to the state', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                await tree.root();
                const { added: bot } = await tree.bot('botId');

                expect(tree.value).toEqual({
                    botId: {
                        id: 'botId',
                        tags: {},
                        metadata: {
                            ref: bot,
                            tags: {},
                        },
                    },
                });
            });

            it('should write workspace tags directly to the object', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: size } = await tree.tag('size', bot);
                const { added: sizeVal } = await tree.val(4, size);

                const { added: extra } = await tree.tag('extra', bot);
                const { added: extraVal } = await tree.val(
                    { test: 'abc' },
                    extra
                );

                expect(tree.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {
                            size: 4,
                            extra: { test: 'abc' },
                        },
                    },
                });
            });

            it('should use last write wins for duplicate bots', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));

                const { added: root } = await site1.root();
                site2.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('test', first);
                const { added: firstTagValue } = await site1.val(
                    null,
                    firstTag
                );

                site2.add(first);
                site2.add(firstTag);
                site2.add(firstTagValue);

                const { added: second } = await site2.bot('botId');
                const { added: secondTag } = await site2.tag('other', second);
                const { added: secondTagValue } = await site2.val(
                    null,
                    secondTag
                );

                site1.add(second);
                site1.add(secondTag);
                site1.add(secondTagValue);

                expect(site1.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {},
                    },
                });
            });

            it('should use last write wins for bot deletions', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));

                const { added: root } = await site1.root();
                await site2.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('test', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);

                const { added: deleteBot } = await site2.delete(first);

                await site1.add(deleteBot);

                expect(site1.value).toEqual({});
            });

            it('should ignore tags that dont have values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: sizeTag } = await site1.tag('size', first);

                expect(site1.value['botId'].tags).toEqual({});
            });

            it('should ignore tags that have null values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: sizeTag } = await site1.tag('size', first);
                const { added: sizeVal } = await site1.val(null, sizeTag);

                expect(site1.value['botId'].tags).toEqual({});
            });

            it('should ignore tags that have undefined values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: sizeTag } = await site1.tag('size', first);
                const { added: sizeVal } = await site1.val(undefined, sizeTag);

                expect(site1.value['botId'].tags).toEqual({});
            });

            it('should ignore tags that have empty string values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: sizeTag } = await site1.tag('size', first);
                const { added: sizeVal } = await site1.val('', sizeTag);

                expect(site1.value['botId'].tags).toEqual({});
            });

            it('should not tags that have whitespace string values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: sizeTag } = await site1.tag('size', first);
                const { added: sizeVal } = await site1.val('\n', sizeTag);

                expect(site1.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {
                            size: '\n',
                        },
                    },
                });
            });

            it('should use last write wins for tags', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));

                const { added: root } = await site1.root();
                await site2.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('test', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);

                const { added: secondTag } = await site2.tag('test', first);
                const { added: secondTagValue } = await site2.val(
                    '123',
                    secondTag
                );

                await site1.add(secondTag);
                await site1.add(secondTagValue);

                expect(site1.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {
                            test: '123',
                        },
                    },
                });
            });

            it('should allow multiple tags', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));

                const { added: root } = await site1.root();
                await site2.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('test', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);

                const { added: secondTag } = await site2.tag('other', first);
                const { added: secondTagValue } = await site2.val(
                    '123',
                    secondTag
                );

                await site1.add(secondTag);
                await site1.add(secondTagValue);

                expect(site1.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {
                            test: 'abc',
                            other: '123',
                        },
                        // metadata: {
                        //     ref: first,
                        //     tags: {}
                        // }
                    },
                });
            });

            it('should use last write wins for tag values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));

                const { added: root } = await site1.root();
                await site2.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('test', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);

                const { added: secondTagValue } = await site2.val(
                    '123',
                    firstTag
                );

                await site1.add(secondTagValue);

                expect(site1.value).toMatchObject({
                    botId: {
                        id: 'botId',
                        tags: {
                            test: '123',
                        },
                        // metadata: {
                        //     ref: first,
                        //     tags: {}
                        // }
                    },
                });
            });

            it('should use sequence for tag renaming', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));
                let site3 = new AuxCausalTree(storedTree(site(3)));

                const { added: root } = await site1.root();
                await site2.add(root);
                await site3.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('first', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);
                await site3.add(first);
                await site3.add(firstTag);
                await site3.add(firstTagValue);

                const { added: firstDelete } = await site1.delete(
                    firstTag,
                    0,
                    5
                );
                const { added: firstInsert } = await site1.insert(
                    0,
                    'reallylong',
                    firstTag
                );
                const { added: secondRename } = await site2.insert(
                    5,
                    '1',
                    firstTag
                );
                const { added: thirdRename } = await site3.insert(
                    0,
                    '99',
                    firstTag
                );

                await site1.add(thirdRename);
                await site1.add(secondRename);

                await site2.add(firstDelete);
                await site2.add(firstInsert);
                await site2.add(thirdRename);

                await site3.add(firstDelete);
                await site3.add(firstInsert);
                await site3.add(secondRename);

                const expected: any = {
                    botId: {
                        id: 'botId',
                        tags: {
                            '99reallylong1': 'abc',
                        },
                    },
                };

                expect(site1.value).toMatchObject(expected);
                expect(site2.value).toMatchObject(expected);
                expect(site3.value).toMatchObject(expected);
            });

            it('should use sequence for tag renaming', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));
                let site3 = new AuxCausalTree(storedTree(site(3)));

                const { added: root } = await site1.root();
                await site2.add(root);
                await site3.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('first', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);
                await site3.add(first);
                await site3.add(firstTag);
                await site3.add(firstTagValue);

                const { added: secondDelete } = await site2.delete(
                    firstTag,
                    1,
                    5
                );
                const { added: secondRename } = await site2.insert(
                    1,
                    '1',
                    firstTag
                );
                const { added: thirdRename } = await site3.insert(
                    0,
                    '99',
                    firstTag
                );

                await site1.add(secondDelete);
                await site1.add(thirdRename);
                await site1.add(secondRename);

                await site2.add(thirdRename);

                await site3.add(secondDelete);
                await site3.add(secondRename);

                const expected: any = {
                    botId: {
                        id: 'botId',
                        tags: {
                            '99f1': 'abc',
                        },
                    },
                };

                expect(site1.value).toMatchObject(expected);
                expect(site2.value).toMatchObject(expected);
                expect(site3.value).toMatchObject(expected);
            });

            it('should ignore tags with empty names', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));

                const { added: root } = await site1.root();

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('first', first);
                await site1.delete(firstTag, 0, 5);

                const expected: AuxState = {
                    botId: {
                        id: 'botId',
                        tags: {},
                        metadata: {
                            ref: first,
                            tags: {},
                        },
                    },
                };

                expect(site1.value).toEqual(expected);
            });

            it('should use sequence for tag values', async () => {
                let site1 = new AuxCausalTree(storedTree(site(1)));
                let site2 = new AuxCausalTree(storedTree(site(2)));
                let site3 = new AuxCausalTree(storedTree(site(3)));

                const { added: root } = await site1.root();
                await site2.add(root);
                await site3.add(root);

                const { added: first } = await site1.bot('botId');
                const { added: firstTag } = await site1.tag('first', first);
                const { added: firstTagValue } = await site1.val(
                    'abc',
                    firstTag
                );

                await site2.add(first);
                await site2.add(firstTag);
                await site2.add(firstTagValue);
                await site3.add(first);
                await site3.add(firstTag);
                await site3.add(firstTagValue);

                const { added: secondDelete } = await site2.delete(
                    firstTagValue,
                    1,
                    3
                );
                const { added: secondRename } = await site2.insert(
                    1,
                    '1',
                    firstTagValue
                );
                const { added: thirdRename } = await site3.insert(
                    0,
                    '99',
                    firstTagValue
                );

                await site1.add(secondDelete);
                await site1.add(thirdRename);
                await site1.add(secondRename);

                await site2.add(thirdRename);

                await site3.add(secondDelete);
                await site3.add(secondRename);

                const expected: any = {
                    botId: {
                        id: 'botId',
                        tags: {
                            first: '99a1',
                        },
                    },
                };

                expect(site1.value).toMatchObject(expected);
                expect(site2.value).toMatchObject(expected);
                expect(site3.value).toMatchObject(expected);
            });
        });

        describe('garbage collection (garbage collect === true)', () => {
            it('should remove old values when adding a new value atom', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: test2 } = await tree.tag('test2', bot);
                const { added: test2Val1 } = await tree.val(99, test2);
                const { added: test2Val2 } = await tree.val(
                    'hello, world',
                    test2
                );

                expect(tree.weave.atoms).toEqual([
                    root,
                    bot,
                    test2,
                    test2Val2,
                    test,
                    testVal2,
                ]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should remove bot data when deleting a bot', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: deleted } = await tree.delete(bot);

                expect(tree.weave.atoms).toEqual([root, bot, deleted]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should not remove old atoms when deleting a section of text', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: deleted } = await tree.delete(testVal2, 0, 1);

                expect(tree.weave.atoms).toEqual([
                    root,
                    bot,
                    test,
                    testVal2,
                    deleted,
                ]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should handle removing bot atoms in a batch', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();

                const bot1 = atom(atomId(1, 10), root.id, bot('botId'));
                const test = atom(atomId(1, 11), bot1.id, tag('test'));
                const testVal1 = atom(atomId(1, 12), test.id, value(99));
                const bot1Delete = atom(atomId(1, 13), bot1.id, del());

                await tree.addMany([bot1, test, testVal1, bot1Delete]);

                expect(tree.weave.atoms).toEqual([root, bot1, bot1Delete]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should collect garbage after addMany()', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const testVal1 = await tree.factory.create(value(99), test);
                const testVal2 = await tree.factory.create(
                    value('hello, world'),
                    test
                );

                const { added: test2 } = await tree.tag('test2', bot);
                const test2Val1 = await tree.factory.create(value(99), test2);
                const test2Val2 = await tree.factory.create(
                    value('hello, world'),
                    test2
                );

                await tree.addMany([test2Val2, test2Val1, testVal1, testVal2]);

                expect(tree.weave.atoms).toEqual([
                    root,
                    bot,
                    test2,
                    test2Val2,
                    test,
                    testVal2,
                ]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should collect garbage after importWeave()', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));
                tree.garbageCollect = false;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: test2 } = await tree.tag('test2', bot);
                const { added: test2Val1 } = await tree.val(99, test2);
                const { added: test2Val2 } = await tree.val(
                    'hello, world',
                    test2
                );

                let other = new AuxCausalTree(storedTree(site(1)));
                other.garbageCollect = true;
                await other.importWeave(tree.weave.atoms);

                expect(other.weave.atoms).toEqual([
                    root,
                    bot,
                    test2,
                    test2Val2,
                    test,
                    testVal2,
                ]);
                expect(other.weave.isValid()).toBe(true);
            });

            it('should collect garbage during creation', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));
                tree.garbageCollect = false;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: test2 } = await tree.tag('test2', bot);
                const { added: test2Val1 } = await tree.val(99, test2);
                const { added: test2Val2 } = await tree.val(
                    'hello, world',
                    test2
                );

                const exported = tree.export();
                let other = new AuxCausalTree(exported, {
                    garbageCollect: true,
                });
                await other.import(exported);

                expect(other.weave.atoms).toEqual([
                    root,
                    bot,
                    test2,
                    test2Val2,
                    test,
                    testVal2,
                ]);
                expect(other.weave.isValid()).toBe(true);
            });

            it('should emit atomsArchived events after GC', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                let archived: Atom<AuxOp>[] = [];
                let error = jest.fn();
                tree.atomsArchived.subscribe(a => {
                    archived.push(...a);
                }, error);

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);
                const { added: testVal1 } = await tree.val(99, test);
                const { added: testVal2 } = await tree.val(
                    'hello, world',
                    test
                );

                const { added: test2 } = await tree.tag('test2', bot);
                const { added: test2Val1 } = await tree.val(99, test2);
                const { added: test2Val2 } = await tree.val(
                    'hello, world',
                    test2
                );

                expect(error).not.toBeCalled();
                expect(archived).toEqual([testVal1, test2Val1]);
                expect(tree.weave.isValid()).toBe(true);
            });

            it('should emit atomsArchived events after batched GC', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                let archived: Atom<AuxOp>[] = [];
                let error = jest.fn();
                tree.atomsArchived.subscribe(a => {
                    archived.push(...a);
                }, error);

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);

                let testVal1: Atom<AuxOp>;
                let testVal2: Atom<AuxOp>;
                await tree.batch(async () => {
                    ({ added: testVal1 } = await tree.val(99, test));
                    ({ added: testVal2 } = await tree.val(
                        'hello, world',
                        test
                    ));
                    return null;
                });

                expect(error).not.toBeCalled();
                expect(archived).toEqual([testVal1]);

                expect(tree.weave.isValid()).toBe(true);
            });

            it('should handle archiving multiple atoms at the same time', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                let archived: Atom<AuxOp>[] = [];
                let error = jest.fn();
                tree.atomsArchived.subscribe(a => {
                    archived.push(...a);
                }, error);

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');

                const test = await tree.factory.create(tag('test'), bot);
                const test2 = await tree.factory.create(tag('test2'), bot);
                const test3 = await tree.factory.create(tag('test3'), bot);

                const val2 = await tree.factory.create(value('def'), test2);
                const val1 = await tree.factory.create(value('abc'), test);
                const val3 = await tree.factory.create(value('ghi'), test3);

                let newTree = new AuxCausalTree(storedTree(site(2)));
                await newTree.addMany([
                    val3,
                    val2,
                    test3,
                    test,
                    test2,
                    val1,
                    root,
                    bot,
                ]);

                expect(error).not.toBeCalled();
                expect(archived).toEqual([]);

                expect(newTree.weave.isValid()).toBe(true);
            });

            it('should handle adding value atoms that will be GCed immediately', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                tree.garbageCollect = true;

                const { added: root } = await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: test } = await tree.tag('test', bot);

                const testVal1 = atom(atomId(1, 10), test.id, value(99));
                const testVal2 = atom(atomId(1, 11), test.id, value('abc'));
                const testVal2Ins = atom(
                    atomId(1, 12),
                    testVal2.id,
                    insert(0, 'z')
                );
                const testVal3 = atom(atomId(1, 13), test.id, value(101));

                await tree.addMany([testVal1, testVal2, testVal2Ins, testVal3]);

                expect(tree.weave.atoms).toEqual([root, bot, test, testVal3]);
                expect(tree.weave.isValid()).toBe(true);
            });
        });

        describe('metadata', () => {
            it('should produce metadata', async () => {
                let tree = new AuxCausalTree(storedTree(site(1)));

                await tree.root();
                const { added: bot } = await tree.bot('botId');
                const { added: size } = await tree.tag('size', bot);
                const { added: sizeVal } = await tree.val(4, size);

                const { added: extra } = await tree.tag('extra', bot);
                const { added: extraVal } = await tree.val(
                    { test: 'abc' },
                    extra
                );

                const { added: last } = await tree.tag('last', bot);
                const { added: lastVal } = await tree.val('123456', last);

                expect(tree.value).toMatchObject({
                    botId: {
                        metadata: {
                            ref: bot,
                            tags: {
                                size: {
                                    ref: size,
                                    name: {
                                        indexes: [0, 1, 2, 3],
                                        refs: [size, size, size, size],
                                    },
                                    value: {
                                        ref: sizeVal,
                                        sequence: null,
                                    },
                                },
                                extra: {
                                    ref: extra,
                                    name: {
                                        indexes: [0, 1, 2, 3, 4],
                                        refs: [
                                            extra,
                                            extra,
                                            extra,
                                            extra,
                                            extra,
                                        ],
                                    },
                                    value: {
                                        ref: extraVal,
                                        sequence: null,
                                    },
                                },
                                last: {
                                    ref: last,
                                    name: {
                                        indexes: [0, 1, 2, 3],
                                        refs: [last, last, last, last],
                                    },
                                    value: {
                                        ref: lastVal,
                                        sequence: {
                                            indexes: [0, 1, 2, 3, 4, 5],
                                            refs: [
                                                lastVal,
                                                lastVal,
                                                lastVal,
                                                lastVal,
                                                lastVal,
                                                lastVal,
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
            });
        });
    });

    describe('insertInto()', () => {
        it('should insert the given text into the given value', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: tag } = await tree.tag('test', bot);
            const { added: val } = await tree.val('abc', tag);

            const bots = tree.value;

            const { added: insert } = await tree.insertIntoTagValue(
                bots['testId'],
                'test',
                '123',
                2
            );

            expect(insert.value).toMatchObject({
                index: 2,
                text: '123',
            });
        });

        it('should insert the given text into the given complex tag value', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: tag } = await tree.tag('test', bot);
            const { added: val } = await tree.val('abc', tag);
            const { added: insert1 } = await tree.insert(0, 'xyz', val); // xyzabc
            const { added: delete1 } = await tree.delete(insert1, 0, 1); // yzabc
            const { added: insert2 } = await tree.insert(0, '1', val); //   yz1abc
            const { added: insert3 } = await tree.insert(3, '?', val); //   yz1abc?
            const { added: delete2 } = await tree.delete(val, 0, 3); //     yz1?

            const bots = tree.value;

            const { added: insert } = await tree.insertIntoTagValue(
                bots['testId'],
                'test',
                '5555',
                2
            );

            expect(insert.cause).toEqual(insert2.id);
            expect(insert.value).toMatchObject({
                index: 0,
                text: '5555',
            });
        });

        it('should handle inserting emojii', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: tag } = await tree.tag('test', bot);
            const { added: val } = await tree.val(
                'the quick brown fox jumped over the lazy dog',
                tag
            );

            const bots = tree.value;

            const { added: insert } = await tree.insertIntoTagValue(
                bots['testId'],
                'test',
                '🦊',
                16
            );

            expect(insert.cause).toEqual(val.id);
            expect(insert.value).toMatchObject({
                index: 16,
                text: '🦊',
            });
            expect(tree.value['testId'].tags.test).toEqual(
                'the quick brown 🦊fox jumped over the lazy dog'
            );
        });
    });

    describe('deleteFrom()', () => {
        it('should delete the specified section of text', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: tag } = await tree.tag('test', bot);
            const { added: val } = await tree.val('abc', tag);

            const bots = tree.value;

            const { added: deleted } = await tree.deleteFromTagValue(
                bots['testId'],
                'test',
                1,
                2
            );

            expect(deleted.length).toBe(1);
            expect(deleted[0].value).toMatchObject({
                start: 1,
                end: 3,
            });
        });

        it('should create deletions spanning multiple insertions', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: tag } = await tree.tag('test', bot);
            const { added: val } = await tree.val('abc', tag);
            const { added: insert1 } = await tree.insert(0, '1', val);
            const { added: insert2 } = await tree.insert(0, '2', insert1);
            const { added: insert3 } = await tree.insert(2, '3', val);

            // "21ab3c"
            const bots = tree.value;

            const { added: deleted } = await tree.deleteFromTagValue(
                bots['testId'],
                'test',
                0,
                6
            );

            expect(deleted.length).toBe(5);

            expect(deleted[0].cause).toEqual(insert2.id);
            expect(deleted[0].value).toMatchObject({
                start: 0,
                end: 1,
            });

            expect(deleted[1].cause).toEqual(insert1.id);
            expect(deleted[1].value).toMatchObject({
                start: 0,
                end: 1,
            });

            expect(deleted[2].cause).toEqual(val.id);
            expect(deleted[2].value).toMatchObject({
                start: 0,
                end: 2,
            });

            expect(deleted[3].cause).toEqual(insert3.id);
            expect(deleted[3].value).toMatchObject({
                start: 0,
                end: 1,
            });

            expect(deleted[4].cause).toEqual(val.id);
            expect(deleted[4].value).toMatchObject({
                start: 2,
                end: 3,
            });
        });
    });

    describe('addBot()', () => {
        it('should add the given object to the state', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: root } = await tree.root();
            const { added: result } = await tree.addBot(newBot);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should add the given workspace to the state', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));
            const newBot: Bot = {
                id: 'test',
                tags: {
                    position: { x: 0, y: 0, z: 0 },
                },
            };

            const { added: root } = await tree.root();
            const { added: result } = await tree.addBot(newBot);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const positionTag = atom(atomId(1, 3), botAtom.id, tag('position'));
            const positionTagValue = atom(
                atomId(1, 4, 1),
                positionTag.id,
                value({ x: 0, y: 0, z: 0 })
            );

            const resultAtoms = result.map(ref => ref);
            expect(resultAtoms).toContainEqual(botAtom);
            expect(resultAtoms).toContainEqual(positionTag);
            expect(resultAtoms).toContainEqual(positionTagValue);

            const treeAtoms = tree.weave.atoms.map(ref => ref);
            expect(treeAtoms).toContainEqual(botAtom);
            expect(treeAtoms).toContainEqual(positionTag);
            expect(treeAtoms).toContainEqual(positionTagValue);
        });

        it('should batch the updates together', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));
            const newBot = {
                id: 'test',
                tags: {
                    position: { x: 0, y: 0, z: 0 },
                },
            };

            const { added: root } = await tree.root();

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));
            const { added: result } = await tree.addBot(newBot);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const positionTag = atom(atomId(1, 3), botAtom.id, tag('position'));
            const positionTagValue = atom(
                atomId(1, 4, 1),
                positionTag.id,
                value({ x: 0, y: 0, z: 0 })
            );

            expect(updates.length).toBe(1);
            const resultAtoms = result.map(ref => ref);
            expect(resultAtoms).toContainEqual(botAtom);
            expect(resultAtoms).toContainEqual(positionTag);
            expect(resultAtoms).toContainEqual(positionTagValue);

            const treeAtoms = tree.weave.atoms.map(ref => ref);
            expect(treeAtoms).toContainEqual(botAtom);
            expect(treeAtoms).toContainEqual(positionTag);
            expect(treeAtoms).toContainEqual(positionTagValue);
        });
    });

    describe('updateBot()', () => {
        it('should update the object with the given values', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('test');
            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    _position: { x: 1, y: 0, z: 0 },
                    abc: '123',
                    num: 99,
                    b: true,
                },
            });

            const positionTag = atom(atomId(1, 3), bot.id, tag('_position'));
            const positionTagValue = atom(
                atomId(1, 7, 1),
                positionTag.id,
                value({ x: 1, y: 0, z: 0 })
            );

            const abcTag = atom(atomId(1, 4), bot.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 8, 1), abcTag.id, value('123'));

            const numTag = atom(atomId(1, 5), bot.id, tag('num'));
            const numTagValue = atom(atomId(1, 9, 1), numTag.id, value(99));

            const bTag = atom(atomId(1, 6), bot.id, tag('b'));
            const bTagValue = atom(atomId(1, 10, 1), bTag.id, value(true));

            expect(result.map(ref => ref)).toEqual([
                positionTag,
                positionTagValue,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
                bTag,
                bTagValue,
            ]);
        });

        it('should handle nested objects', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('test');
            await tree.updateBot(tree.value['test'], {
                tags: {
                    _position: { x: 0, y: 0, z: 0 },
                },
            });

            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    _position: <any>{ x: 1 },
                },
            });

            const positionTag = atom(atomId(1, 3), bot.id, tag('_position'));
            const positionTagValue = atom(
                atomId(1, 5, 1),
                positionTag.id,
                value({ x: 1, y: 0, z: 0 })
            );

            expect(result.map(ref => ref)).toEqual([positionTagValue]);
        });

        it('should batch the updates together', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('test');

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));

            await tree.updateBot(tree.value['test'], {
                tags: {
                    _position: { x: 0, y: 0, z: 0 },
                },
            });

            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    _position: <any>{ x: 1 },
                },
            });

            const positionTag = atom(atomId(1, 3), bot.id, tag('_position'));
            const positionTagValue = atom(
                atomId(1, 5, 1),
                positionTag.id,
                value({ x: 1, y: 0, z: 0 })
            );

            expect(updates.length).toBe(2);
            expect(result.map(ref => ref)).toEqual([positionTagValue]);
        });

        it('should not write duplicates', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const bot = createBot('test', {
                _workspace: null,
                _position: { x: 0, y: 0, z: 0 },
                test: 99,
            });
            await tree.addBot(bot);

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));

            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    test: 99,
                    _workspace: null,
                    _position: { x: 0, y: 0, z: 0 },
                },
            });

            expect(updates.length).toBe(0);
            expect(result.map(ref => ref)).toEqual([]);
        });

        it('should allow setting null', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const bot = createBot('test', {
                _workspace: null,
                _position: { x: 0, y: 0, z: 0 },
                test: 99,
            });
            await tree.addBot(bot);

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));

            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    test: null,
                },
            });

            expect(updates.length).toBe(1);
            expect(result.map(ref => ref)).toEqual([
                atom(atomId(1, 9, 1), atomId(1, 5), value(null)),
            ]);
        });

        it('should handle setting a new object value when it was previously set to null', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const bot = createBot('test', {});
            await tree.addBot(bot);

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));

            await tree.updateBot(tree.value['test'], {
                tags: {
                    obj: {
                        hello: 'test',
                    },
                },
            });
            await tree.updateBot(tree.value['test'], {
                tags: {
                    obj: null,
                },
            });
            const { added: result } = await tree.updateBot(tree.value['test'], {
                tags: {
                    obj: {
                        hello: 'cool',
                    },
                },
            });

            expect(result.map(ref => ref)).toEqual([
                atom(
                    atomId(1, 6, 1),
                    atomId(1, 3),
                    value({
                        hello: 'cool',
                    })
                ),
            ]);
        });
    });

    describe('addEvents()', () => {
        it('should handle bot update events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('test');
            const { added: result } = await tree.addEvents([
                botUpdated('test', {
                    tags: {
                        _position: { x: 1, y: 0, z: 0 },
                        abc: '123',
                        num: 99,
                        b: true,
                    },
                }),
            ]);

            const positionTag = atom(atomId(1, 3), bot.id, tag('_position'));
            const positionTagValue = atom(
                atomId(1, 7, 1),
                positionTag.id,
                value({ x: 1, y: 0, z: 0 })
            );

            const abcTag = atom(atomId(1, 4), bot.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 8, 1), abcTag.id, value('123'));

            const numTag = atom(atomId(1, 5), bot.id, tag('num'));
            const numTagValue = atom(atomId(1, 9, 1), numTag.id, value(99));

            const bTag = atom(atomId(1, 6), bot.id, tag('b'));
            const bTagValue = atom(atomId(1, 10, 1), bTag.id, value(true));

            expect(result.map(ref => ref)).toEqual([
                positionTag,
                positionTagValue,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
                bTag,
                bTagValue,
            ]);
        });

        it('should handle bot added events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: root } = await tree.root();
            const { added: result } = await tree.addEvents([botAdded(newBot)]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should handle bot removed events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const { added: bot } = await tree.bot('test');

            const { added: result } = await tree.addEvents([
                botRemoved('test'),
            ]);

            const deleteBot = atom(atomId(1, 3, 1), bot.id, del());

            expect(result.map(ref => ref)).toEqual([deleteBot]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                bot,
                deleteBot,
            ]);
        });

        it('should handle bot removed events on already deleted bots', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            await tree.root();
            const { added: bot } = await tree.bot('testId');
            const { added: del } = await tree.delete(bot);

            const { added: result } = await tree.addEvents([
                botRemoved('test'),
            ]);

            expect(result.map(ref => ref)).toEqual([]);
        });

        it('should handle transaction events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const { added: newBot } = await tree.bot('test');
            const newBot2 = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: result } = await tree.addEvents([
                transaction([botRemoved('test'), botAdded(newBot2)]),
            ]);

            const deleteBot = atom(atomId(1, 3, 1), newBot.id, del());

            const botAtom = atom(atomId(1, 4), root.id, bot('test'));
            const abcTag = atom(atomId(1, 5), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 7, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 6), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 8, 1), numTag.id, value(5));

            expect(result.map(ref => ref)).toEqual([
                deleteBot,
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
                newBot,
                deleteBot,
            ]);
        });

        it('should add bots from add_state events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: result } = await tree.addEvents([
                addState({
                    test: newBot,
                }),
            ]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should update bots from add_state events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: result } = await tree.addEvents([
                addState({
                    test: newBot,
                }),
            ]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should handle bot updates immediately after bot added events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: result } = await tree.addEvents([
                botAdded(newBot),
                botUpdated('test', {
                    tags: {
                        num: 22,
                    },
                }),
            ]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));

            // First gets skipped because the bot updated event is merged into
            // the bot added event.
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            const numTagValue2 = atom(atomId(1, 6, 1), numTag.id, value(22));

            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue2,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue2,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should handle bot removed immediately after bot added events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: result } = await tree.addEvents([
                botAdded(newBot),
                botRemoved('test'),
            ]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            const removedAtom = atom(atomId(1, 7, 1), botAtom.id, del());

            expect(result.map(ref => ref)).toEqual([]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([root]);
        });

        it('should handle bot updates after bot removed events', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            await tree.addEvents([botAdded(newBot)]);

            const { added: result } = await tree.addEvents([
                botRemoved('test'),
                botUpdated('test', {
                    tags: {
                        num: 22,
                    },
                }),
            ]);

            const botAtom = atom(atomId(1, 2), root.id, bot('test'));
            const abcTag = atom(atomId(1, 3), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 5, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 4), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 6, 1), numTag.id, value(5));

            const removedAtom = atom(atomId(1, 7, 1), botAtom.id, del());

            expect(result.map(ref => ref)).toEqual([removedAtom]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                removedAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
            ]);
        });

        it('should batch updates', async () => {
            let tree = new AuxCausalTree(storedTree(site(1)));

            const { added: root } = await tree.root();
            const newBot = createBot('test', <any>{
                abc: 'def',
                num: 5,
            });

            const { added: otherBot } = await tree.bot('other');
            const { added: otherTag } = await tree.tag('tag', otherBot);
            const { added: otherTagValue } = await tree.val('99', otherTag);

            let updates: Atom<AuxOp>[][] = [];
            tree.atomAdded.subscribe(refs => updates.push(refs));

            const { added: result } = await tree.addEvents([
                addState({
                    test: newBot,
                    other: <any>(<Partial<Object>>{
                        id: 'other',
                        type: 'object',
                        tags: {
                            tag: 'hello',
                        },
                    }),
                }),
            ]);

            const botAtom = atom(atomId(1, 5), root.id, bot('test'));
            const abcTag = atom(atomId(1, 7), botAtom.id, tag('abc'));
            const abcTagValue = atom(atomId(1, 9, 1), abcTag.id, value('def'));

            const numTag = atom(atomId(1, 8), botAtom.id, tag('num'));
            const numTagValue = atom(atomId(1, 10, 1), numTag.id, value(5));

            const newOtherTagValue = atom(
                atomId(1, 6, 1),
                otherTag.id,
                value('hello')
            );

            expect(updates.length).toBe(1);
            expect(result.map(ref => ref)).toEqual([
                botAtom,
                abcTag,
                abcTagValue,
                numTag,
                numTagValue,
                newOtherTagValue,
            ]);
            expect(tree.weave.atoms.map(ref => ref)).toEqual([
                root,
                botAtom,
                numTag,
                numTagValue,
                abcTag,
                abcTagValue,
                otherBot,
                otherTag,
                newOtherTagValue,
                otherTagValue,
            ]);
        });
    });
});
