// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { Item } from '../models/item';
import { Unit } from '../models/unit';

import { InputHints, MessageFactory, RecognizerResult, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';

import {
    ComponentDialog,
    DialogContext,
    DialogSet,
    DialogState,
    DialogTurnResult,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { AddItemDialog, IAddItemDialogResult } from './addItemDialog';
import { ShoppingListRecognizer } from './addItemRecognizer';
import { GetAllItemsDialog } from './getAllItemsDialog';
import { IQueryItemIdDialogInput, IQueryItemIdDialogResult, QueryItemIdDialog } from './queryItemIdDialog';
import { RemoveAllItemsDialog } from './removeAllItemsDialog';
import { FunctionService } from '../services/functionsService';
import { IUpdateMultipleItemsDialogInput, UpdateMultipleItemsDialog } from './updateMultipleItemsDialog';
import { IDialogResult } from '../models/dialogResult';

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

export class MainDialog extends ComponentDialog {
    private luisRecognizer: ShoppingListRecognizer;
    private shoppingListFunctionService: FunctionService;

    constructor(luisRecognizer: ShoppingListRecognizer, addItemDialog: AddItemDialog, getAllItemsDialog: GetAllItemsDialog, markItemDialog: QueryItemIdDialog, unmarkItemDialog: QueryItemIdDialog, removeSingleItemDialog: QueryItemIdDialog, removeAllItemsDialog: RemoveAllItemsDialog, shoppingListFunctionService: FunctionService) {
        super('MainDialog');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        if (!addItemDialog) throw new Error('[MainDialog]: Missing parameter \'addItemDialog\' is required');

        if (!getAllItemsDialog) throw new Error('[MainDialog]: Missing parameter \'getAllItemsDialog\' is required');

        if (!markItemDialog) throw new Error('[MainDialog]: Missing parameter \'markItemDialog\' is required');

        if (!unmarkItemDialog) throw new Error('[MainDialog]: Missing parameter \'unmarkItemDialog\' is required');

        if (!removeAllItemsDialog) throw new Error('[MainDialog]: Missing parameter \'removeAllItemsDialog\' is required');

        if (!removeSingleItemDialog) throw new Error('[MainDialog]: Missing parameter \'removeSingleItemDialog\' is required');

        if (!shoppingListFunctionService) throw new Error('[MainDialog]: Missing parameter \'shoppingListFunctionService\' is required');
        this.shoppingListFunctionService = shoppingListFunctionService;

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(addItemDialog)
            .addDialog(getAllItemsDialog)
            .addDialog(markItemDialog)
            .addDialog(unmarkItemDialog)
            .addDialog(removeAllItemsDialog)
            .addDialog(removeSingleItemDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {TurnContext} context
     */
    public async run(context: TurnContext, accessor: StatePropertyAccessor<DialogState>) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(context);

        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }



    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    private async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (!this.luisRecognizer.isConfigured) {
            const luisConfigMsg = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(luisConfigMsg, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        const messageText = (stepContext.options as any).restartMsg ? (stepContext.options as any).restartMsg : 'What can I help you with today?\nSay something like "Add 200 gramm bananas"';
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt('TextPrompt', { prompt: promptMessage });
    }

    /**
     * Second step in the waterall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    private async actStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = new Item();

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the BookingDialog path.
            return await stepContext.beginDialog('addItemDialog', item);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        console.dir(luisResult);
        console.log("before switch");
        const conversationId = stepContext.context.activity.conversation.id;
        console.log(conversationId);
        switch (LuisRecognizer.topIntent(luisResult)) {
            case 'AddItem':
                console.log("add item dialog");
                const itemName = this.luisRecognizer.getItemNameEntities(luisResult);
                const unit = this.luisRecognizer.getUnitEntities(luisResult);
                item.itemName = itemName;
                item.unit = unit;
                return await stepContext.beginDialog('addItemDialog', item);

            // const itemToAddResult = await stepContext.beginDialog('addItemDialog', item);
            // const itemToAdd = itemToAddResult.result as Item;
            // console.dir(itemToAddResult);
            // console.dir(itemToAdd);
            // if (itemToAdd) {
            //     const addedResult = await this.shoppingListFunctionService.addItem(stepContext.context.activity.conversation.id, itemToAdd);
            //     if (!addedResult.ok) {
            //         //TODO more specific error to tell the user what was wrong.
            //         const couldNotAddMessage = `Sorry, I could not add ${itemToAdd.itemName}`;
            //         await stepContext.context.sendActivity(couldNotAddMessage, couldNotAddMessage, InputHints.IgnoringInput);
            //     } else {
            //         const addedSuccessMessage = `I added ${itemToAdd.itemName} to your shopping list`;
            //         await stepContext.context.sendActivity(addedSuccessMessage, addedSuccessMessage, InputHints.IgnoringInput);
            //     }

            // }
            // console.log("end switch add item dialog");
            // break;
            case 'GetAll':
                console.log("get all");
                const itemsResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);

                if (!itemsResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                const allItems = await itemsResponse.json() as Item[];
                return await stepContext.beginDialog('getAllItemsDialog', allItems);
            case 'MarkItem':
                console.log("mark item");
                const itemToMark = this.getItemWithNameOrPosition(luisResult);
                const itemsInShoppingListMarkResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);
                if (!itemsInShoppingListMarkResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                console.log("itemsInShoppingListMarkResponse");
                console.dir(itemsInShoppingListMarkResponse);
                const itemsInShoppingListMark = await itemsInShoppingListMarkResponse.json() as Item[];
                console.dir(itemsInShoppingListMark);
                const markItemInput: IQueryItemIdDialogInput = {
                    itemsInList: itemsInShoppingListMark,
                    itemToFindInList: itemToMark
                }
                return stepContext.beginDialog('markItemDialog', markItemInput);
            case 'UnmarkItem':
                console.log("unmark item");
                const itemToUnmark = this.getItemWithNameOrPosition(luisResult);
                const itemsInShoppingListUnmarkResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);
                if (!itemsInShoppingListUnmarkResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                const itemsInShoppingListUnmark = await itemsInShoppingListUnmarkResponse.json() as Item[];

                const unmarkItemInput: IQueryItemIdDialogInput = {
                    itemsInList: itemsInShoppingListUnmark,
                    itemToFindInList: itemToUnmark
                }
                return await stepContext.beginDialog('unmarkItemDialog', unmarkItemInput);
            case 'RemoveAll':
                console.log('[DEBUG] remove all');
                const response = await this.shoppingListFunctionService.removeAllItems(conversationId);
                if (!response.ok) {
                    const couldNotRemoveItems = 'Sorry, I currently cannot remove all items. Please try again later.';
                    await stepContext.context.sendActivity(couldNotRemoveItems, couldNotRemoveItems, InputHints.IgnoringInput);
                    break;
                }
                return await stepContext.beginDialog('removeAllItemsDialog');
            case 'RemoveItem':
                console.log('[DEBUG] remove item');
                const itemToRemove = this.getItemWithNameOrPosition(luisResult);
                const itemsInShoppingListRemoveResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);
                if (!itemsInShoppingListRemoveResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                const itemsInShoppingListRemove = await itemsInShoppingListRemoveResponse.json() as Item[];

                const removeItemInput: IQueryItemIdDialogInput = {
                    itemsInList: itemsInShoppingListRemove,
                    itemToFindInList: itemToRemove
                }
                return await stepContext.beginDialog('removeItemDialog', removeItemInput);
            default:
                // Catch all for unhandled intents
                const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${LuisRecognizer.topIntent(luisResult)})`;;
                await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }
        console.log("after switch");
        return await stepContext.next();
    }


    private getItemWithNameOrPosition(luisResult: RecognizerResult) {
        const item = new Item();
        const itemName = this.luisRecognizer.getItemNameEntities(luisResult);
        item.itemName = itemName;
        if (this.luisRecognizer.hasPositionEntity(luisResult)) {
            item.positionInShoppingList = this.luisRecognizer.getPositionEntity(luisResult);
        }
        console.dir(item);
        return item;
    }

    /**
     * This is the final step in the main waterfall dialog.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // If the child dialog ("addItemDialog") was cancelled or the user failed to confirm, the result here will be null.
        console.log("final step");
        console.dir(stepContext.result);
        if (stepContext.result) {
            const conversationId = stepContext.context.activity.conversation.id;
            const dialogResult = stepContext.result as IDialogResult;
            switch (dialogResult.dialogId) {
                case 'addItemDialog':
                    const addItemDialogResult = dialogResult as IAddItemDialogResult;

                    const itemToAdd = addItemDialogResult.itemToAdd;
                    let itemAddedMessage = 'Something went wrong trying to add an item.';
                    if (itemToAdd) {
                        const addedResult = await this.shoppingListFunctionService.addItem(conversationId, itemToAdd);
                        console.dir(addedResult.statusText);
                        if (!addedResult.ok) {
                            //TODO more specific error to tell the user what was wrong.
                            itemAddedMessage = `Sorry, I could not add ${itemToAdd.toString()}`;
                        } else {
                            itemAddedMessage = `I added ${itemToAdd.toString()} to your shopping list`;
                        }
                    }

                    await stepContext.context.sendActivity(itemAddedMessage, itemAddedMessage, InputHints.IgnoringInput);

                    break;
                case 'markItemDialog':
                    const markItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    console.log("marked query result:");
                    console.dir(markItemDialogResult);
                    let message = "Sorry, something went wrong trying to mark an item in your shopping list as complete.";
                    if (markItemDialogResult && markItemDialogResult.foundItemId) {
                        const patchedItemMark: Partial<Item> = {
                            id: markItemDialogResult.foundItemId,
                            marked: true
                        }
                        const patchedItemMarkResponse = await this.shoppingListFunctionService.patchItemInShoppingList(conversationId, patchedItemMark);
                        const patchedItemMarkResponseBody = await patchedItemMarkResponse.json();
                        console.log("marked funtions response:");
                        console.dir(patchedItemMarkResponseBody);
                        const itemFromBodyMarked = patchedItemMarkResponseBody.item as Item;
                        if (!patchedItemMarkResponse.ok) {
                            if (itemFromBodyMarked) {
                                message = `Sorry, I could not mark ${itemFromBodyMarked.toString()} as complete.`;
                            }
                        } else {
                            if (itemFromBodyMarked) {
                                message = `I've marked ${itemFromBodyMarked.toString()} as complete.`;
                            } else {
                                message = 'I was successful marking the item in your shopping list as complete';
                            }
                        }
                    }
                    await stepContext.context.sendActivity(message, message, InputHints.IgnoringInput);
                    break;
                case 'removeItemDialog':
                    const removeItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    let removeMessage = "Sorry, something went wrong deleting one item.";
                    if (removeItemDialogResult && removeItemDialogResult.foundItemId) {
                        const removeItemServiceResponse = await this.shoppingListFunctionService.removeItemByID(conversationId, removeItemDialogResult.foundItemId);
                        if (removeItemServiceResponse.ok) {
                            removeMessage = 'I deleted the item from the shopping list for you.';

                        }
                    }
                    await stepContext.context.sendActivity(removeMessage, removeMessage, InputHints.IgnoringInput);
                    break;
                case 'unmarkItemDialog':
                    const unmarkItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    let unmarkMessage = "Sorry, something went wrong trying to change an item in your shopping list as not complete.";
                    if (unmarkItemDialogResult && unmarkItemDialogResult.foundItemId) {
                        const patchedItemUnmark: Partial<Item> = {
                            id: unmarkItemDialogResult.foundItemId,
                            marked: false
                        }
                        const patchedItemUnmarkResponse = await this.shoppingListFunctionService.patchItemInShoppingList(conversationId, patchedItemUnmark);
                        const patchedItemUnmarkResponseBody = await patchedItemUnmarkResponse.json();
                        const itemFromBodyUnmarked = patchedItemUnmarkResponseBody.item as Item;
                        if (!patchedItemUnmarkResponseBody.ok) {
                            if (itemFromBodyUnmarked) {
                                unmarkMessage = `Sorry, I could not update ${itemFromBodyUnmarked.toString()} as not complete.`;
                            }
                        } else {
                            if (itemFromBodyUnmarked) {
                                unmarkMessage = `${itemFromBodyUnmarked.toString()} is now marked as not complete.`;
                            } else {
                                unmarkMessage = 'I was successful marking the item in your shopping list as not complete';
                            }
                        }
                    }
                    await stepContext.context.sendActivity(unmarkMessage, unmarkMessage, InputHints.IgnoringInput);
                    break;
            }
        }

        // Restart the main dialog waterfall with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }
}
