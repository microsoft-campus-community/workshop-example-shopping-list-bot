import { Activity, Middleware, ResourceResponse, TurnContext } from "botbuilder";
import { IUpdateMultipleItemsDialogInput } from "../dialogs/updateMultipleItemsDialog";
import { Item } from "../models/item";
import { IItemUpdateResponse } from "../models/itemUpdateResponse";
import { FunctionService } from "../services/functionsService";

export class ShoppingListAdaptiveCardResponseMiddleware implements Middleware {
    private functionService: FunctionService;
    constructor(functionService: FunctionService) {
        if (!functionService) {
            throw new Error('ShoppingListAdaptiveCardResponseMiddleware requires a functionService instance.');
        }
        this.functionService = functionService;
    }

    public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
        const activityValue = context.activity.value;
        if (activityValue) {
            const itemsToUpdate = this.parseAdaptiveCardForMarkedItemsUpdate(activityValue);
            if (itemsToUpdate) {
                await this.updateItems(context, itemsToUpdate);
            }
        }


        await next();
    }

    private async updateItems(context: TurnContext, itemsToUpdate: Array<Partial<Item>>) {
        if (itemsToUpdate.length > 0) {
            const conversationId = context.activity.conversation.id;

            const updateCalls: Promise<Response>[] = [];
            itemsToUpdate.forEach((item, index) => {
                updateCalls.push(this.functionService.patchItemInShoppingList(conversationId, item));
            });
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