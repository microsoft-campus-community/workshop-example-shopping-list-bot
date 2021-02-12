import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs"
import { Item } from "../models/item";
import { Unit } from "../models/unit";
import { FunctionService } from "../services/functionsService";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { MarkedDialog } from "./markedDialog";
import { UnitDialog } from "./unitDialog";

const WATERFALL_DIALOG = 'updateMultipleItemsWaterfallDialog';
const TEXT_PROMPT = 'updateMultipleItemsTextPrompt';
const UNIT_DIALOG = 'updateMultipleItemsUnitDialog';
const MARKED_DIALOG = 'updateMultipleItemsMarkedDialog';
const CONFIRM_PROMPT = 'updateMultipleItemsPromptDialog';


export interface IUpdateMultipleItemsDialogInput {
    itemsToUpdate: Partial<Item>[],
    done?: boolean

}

export class UpdateMultipleItemsDialog extends CancelAndHelpDialog {
    private shoppingListFunctionService: FunctionService;
    constructor(id: string, shoppingListFunctionService: FunctionService) {
        super(id || 'updateMultipleItemsDialog');
        this.shoppingListFunctionService = shoppingListFunctionService;

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new UnitDialog(UNIT_DIALOG))
            .addDialog(new MarkedDialog(MARKED_DIALOG))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.itemNameStep.bind(this),
                this.unitStep.bind(this),
                this.markedStep.bind(this),
                this.queryMoreToUpdate.bind(this),
                this.updateStep.bind(this),
                this.finalStep.bind(this)
            ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async itemNameStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const input = stepContext.options as IUpdateMultipleItemsDialogInput;
        if (input.done) {
            // If they're done exit 
            await this.updateItems(stepContext, input.itemsToUpdate);
            return await stepContext.endDialog();
        } else {
            const messageText = 'Which item would you like to update?';
            const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: message });
        }

    }

    private async unitStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const itemName = stepContext.result as string;
        const input = stepContext.options as IUpdateMultipleItemsDialogInput;
        const newItem = new Item();
        input.itemsToUpdate.push(newItem);
        newItem.itemName = itemName;

        return await stepContext.beginDialog(UNIT_DIALOG);
    }

    private async markedStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unit = stepContext.result as Unit;
        const input = stepContext.options as IUpdateMultipleItemsDialogInput;
        const itemToUpdate = input.itemsToUpdate[input.itemsToUpdate.length - 1];
        itemToUpdate.unit = unit;
        return await stepContext.beginDialog(MARKED_DIALOG);
    }

    private async queryMoreToUpdate(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const markedValue = stepContext.result as boolean;
        const input = stepContext.options as IUpdateMultipleItemsDialogInput;
        const itemToUpdate = input.itemsToUpdate[input.itemsToUpdate.length - 1];
        itemToUpdate.marked = markedValue;
        const markedText = markedValue ? 'complete' : 'incomplete';
        const messageText = `I am going to update ${itemToUpdate.toString()} marked as ${markedText}. Do you want to update more items?`;
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: message });
    }

    private async updateStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const moreItemsToUpdate = stepContext.result as boolean;
        const input = stepContext.options as IUpdateMultipleItemsDialogInput;
        input.done = !moreItemsToUpdate;
        if (moreItemsToUpdate) {
            return await stepContext.replaceDialog(this.id, input);
        } else {
            return await this.updateItems(stepContext, input.itemsToUpdate);
        }
    }

    private async updateItems(stepContext: WaterfallStepContext, itemsToUpdate: Partial<Item>[]): Promise<DialogTurnResult<any>> {
        const conversationId = stepContext.context.activity.conversation.id;

        const updateCalls: Promise<Response>[] = [];
        itemsToUpdate.forEach((item, index) => {
            updateCalls.push(this.shoppingListFunctionService.patchItemInShoppingList(conversationId, item));
        });
        let itemsThatCouldNotBeUpdated: string | undefined = undefined;
        let couldUpdateAllItems = true;
        for (let index = 0; index < updateCalls.length; index++) {
            const updateCallResponse = updateCalls[index];
            const result = await updateCallResponse;
            if (!result.ok) {
                const itemThatCouldNotBeUpdated = await result.json() as Item;
                couldUpdateAllItems = false;
                if (itemThatCouldNotBeUpdated) {
                    if (!itemThatCouldNotBeUpdated) {
                        itemsThatCouldNotBeUpdated = itemThatCouldNotBeUpdated.itemName;
                    } else if (index === updateCalls.length - 1) {
                        itemsThatCouldNotBeUpdated += ` and ${itemThatCouldNotBeUpdated.itemName}`;
                    } else {
                        itemsThatCouldNotBeUpdated += `, ${itemThatCouldNotBeUpdated.itemName}`;
                    }
                }
            }
        }
        let messageText = 'I updated all items for you';

        if (!couldUpdateAllItems) {
            if (itemsThatCouldNotBeUpdated.length > 0) {
                messageText = `Sorry, I could not update the following items ${itemsThatCouldNotBeUpdated}. Please try again later.`;
            } else {
                messageText = 'Something went wrong. Some items could not be updated. I suggest you check which items are in your shopping list by saying something like "show me my shopping list" and try updating the items that could not be updated again.';
            }
        }
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return stepContext.prompt(TEXT_PROMPT, { prompt: message });
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        return await stepContext.endDialog();
    }


}