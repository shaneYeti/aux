import { Bot } from '../bots/Bot';
import { UpdateBotAction } from '../bots/BotEvents';

export type FilterFunction = ((value: any) => boolean) | any;
export interface BotFilterFunction {
    (bot: Bot): boolean;
    sort?: (bot: Bot) => any;
}

/**
 * Defines an interface for objects that can allow the sandbox to communicate with the outside world.
 * In particular, this interface allows the sandbox to request tag values and tag objects.
 */
export interface SandboxInterface {
    /**
     * The list of objects contained by the interface.
     */
    objects: Bot[];

    /**
     * Calculates the list of tag values for the given tag.
     * @param tag The tag.
     * @param filter The filter to apply to the tag values.
     * @param extras Extra data.
     */
    listTagValues(tag: string, filter?: FilterFunction, extras?: any): any;

    /**
     * Calculates the list of objects that have the given tag.
     * @param tag The tag.
     * @param filter The filter to apply to the tag values.
     * @param extras Extra data.
     */
    listObjectsWithTag(tag: string, filter?: FilterFunction, extras?: any): any;

    /**
     * Calculates the list of objects that match the given filters.
     * @param filters The filters.
     */
    listObjects(...filters: BotFilterFunction[]): Bot[];

    /**
     * Lists the objects on the same grid space as the given object.
     * @param obj The object.
     */
    list(obj: any, context: string): any;

    /**
     * Calculates a new UUID.
     */
    uuid(): string;

    /**
     * Adds the given bot to the interface.
     * @param bot
     */
    addBot(bot: Bot): Bot;

    /**
     * Removes the given bot ID from the interface.
     * @param id The ID of the bot to remove.
     */
    removeBot(id: string): void;

    /**
     * Gets the ID of the current user.
     */
    userId(): string;

    /**
     * Gets the given tag for the given bot.
     * @param bot
     * @param tag
     */
    getTag(bot: Bot, tag: string): any;

    /**
     * Sets the given tag on the given bot.
     * @param bot
     * @param tag
     * @param value
     */
    setTag(bot: Bot, tag: string, value: any): any;

    /**
     * Gets the list of bot updates that happened.
     */
    getBotUpdates(): UpdateBotAction[];
}
