import { Middleware, TurnContext } from "botbuilder";
import { Item } from "../models/item";
import { FunctionService } from "../services/functionsService";

/**
 * Middleware to process all activities send by the chat to the user.
 * This middleware looks out for responses to the adaptive card described by {shoppingListCard.json}.
 * The response contains information about which items should be marked or not marked.
 * If this middleware finds such a response it updates the items according to the provided marked or unmarked information provided.
 */
export class ShoppingListAdaptiveCardResponseMiddleware implements Middleware {
    /**
     * To call the list API.
     */
    private functionService: FunctionService;

    /**
     * 
     * @param functionService instance to call the list API.
     */
    constructor(functionService: FunctionService) {
        if (!functionService) {
            throw new Error('ShoppingListAdaptiveCardResponseMiddleware requires a functionService instance.');
        }
        this.functionService = functionService;
    }

    /**
     * Handler that is invoked every time one turn happens between the bot and a chat.
     * 
     * Postcondition: If this middleware recognizes context.activity.value as updated marked/unmarked information for items than it updates the items according to the new marked/umnarked value.
     * @param context current context/state of the conversation.
     * @param next the middleware that should be called after this handler is done.
     * @param context.activity.value can be a map with item ids as keys and boolean as values. With the values indicating for the specific items if they should be marked or not. Can be undefined or null.
     */
    public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
        const activityValue = context.activity.value;
        if (activityValue) {
            const itemsToUpdate = this.parseAdaptiveCardForMarkedItemsUpdate(activityValue);
            if (itemsToUpdate) {
                await this.updateItems(context, itemsToUpdate);
            }
        }

        // Always call the next middleware.
        await next();
    }

    /**
     * Updates given items in the shopping list corresponding to this conversation.
     * Precondition: Need a working {@link functionService}.
     * 
     * Postcondition: Tries to update all items. If successful lets the chat know. If an error occursit will try to update the remaining items and the previous item updates are not rolled back, but lets chat know that some items could not be updated.
     * @param context current context/state of the conversation.
     * @param itemsToUpdate 
     */
    private async updateItems(context: TurnContext, itemsToUpdate: Array<Partial<Item>>) {
        if (itemsToUpdate && itemsToUpdate.length > 0) {
            const conversationId = context.activity.conversation.id;
            const updateCalls: Promise<Response>[] = [];

            // Start all the calls to the list API asynchronously.
            itemsToUpdate.forEach((item, index) => {
                updateCalls.push(this.functionService.patchItemInShoppingList(conversationId, item));
            });

            // Wait and collect results of all the API calls.
            let itemsThatCouldNotBeUpdatedCount = 0;
            for (let index = 0; index < updateCalls.length; index++) {
                const updateCallResponse = updateCalls[index];
                const result = await updateCallResponse;
                if (!result.ok) {
                    ++itemsThatCouldNotBeUpdatedCount;
                }
            }

            let messageText = 'I updated all items for you';
            if (itemsThatCouldNotBeUpdatedCount > 0) {
                messageText = `Something went wrong. ${itemsThatCouldNotBeUpdatedCount} items could not be updated. I suggest you check which items are in your shopping list by saying something like "show me my shopping list" and try updating the items that could not be updated again.`;
            }
            context.sendActivity(messageText, messageText);

        }
    }

    /**
     * Parse an object to figure out if it is a response to the {@link shoppingListCard.json} adaptive card.
     * @param adaptiveCardPayload valid or invalid response to the adaptive card defined by {@link shoppingListCard.json}
     * @returns a list of items that could be found in the response to the adaptive card. Each item will only have its id and marked properties set. Returns undefined if the response payload could not be parsed.
     */
    private parseAdaptiveCardForMarkedItemsUpdate(adaptiveCardPayload: Record<string, boolean>): Partial<Item>[] {
        const itemsToUpdate: Partial<Item>[] = [];
        try {
            Object.keys(adaptiveCardPayload).forEach(itemIdKey => {
                const itemMarkedValueString = adaptiveCardPayload[itemIdKey];
                if (typeof itemMarkedValueString === 'string') {
                    const itemMarkedValue = JSON.parse(itemMarkedValueString);
                    itemsToUpdate.push(
                        {
                            id: itemIdKey,
                            marked: itemMarkedValue
                        }
                    )
                }

            });
        } catch (error) {
            return undefined;
        }
        return itemsToUpdate;
    }
}