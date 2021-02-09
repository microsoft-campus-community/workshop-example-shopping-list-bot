// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { Item } from '../models/item';
import { Unit } from '../models/unit';

import { InputHints, MessageFactory, RecognizerResult, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';

import {
    ComponentDialog,
    DialogSet,
    DialogState,
    DialogTurnResult,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { AddItemDialog } from './addItemDialog';
import { ShoppingListRecognizer } from './addItemRecognizer';
import { GetAllItemsDialog } from './getAllItemsDialog';
import { QueryItemNameOrPositionDialog } from './queryItemNameOrPositionDialog';
import { RemoveAllItemsDialog } from './removeAllItemsDialog';
import { FunctionService } from '../services/functionsService';

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

export class MainDialog extends ComponentDialog {
    private luisRecognizer: ShoppingListRecognizer;
    private shoppingListFunctionService: FunctionService;

    constructor(luisRecognizer: ShoppingListRecognizer, addItemDialog: AddItemDialog, getAllItemsDialog: GetAllItemsDialog, markItemDialog: QueryItemNameOrPositionDialog, unmarkItemDialog: QueryItemNameOrPositionDialog, removeSingleItemDialog: QueryItemNameOrPositionDialog, removeAllItemsDialog: RemoveAllItemsDialog, shoppingListFunctionService: FunctionService) {
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
                const itemsResponse = await this.shoppingListFunctionService.getItemsInShoppingList(stepContext.context.activity.conversation.id);

                if (!itemsResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                const items = await itemsResponse.json() as Item[];
                return await stepContext.beginDialog('getAllItemsDialog', items);
            case 'MarkItem':
                console.log("mark item");
                const itemToMark = this.getItemWithNameOrPosition(luisResult);
                return await stepContext.beginDialog('markItemDialog', itemToMark);
            case 'UnmarkItem':
                console.log("unmark item");
                const itemToUnmark = this.getItemWithNameOrPosition(luisResult);
                return await stepContext.beginDialog('unmarkItemDialog', itemToUnmark);
            case 'RemoveAll':
                console.log('[DEBUG] remove all');
                return await stepContext.beginDialog('removeAllItemsDialog');
            case 'RemoveItem':
                console.log('[DEBUG] remove item');
                const itemToRemove = this.getItemWithNameOrPosition(luisResult);
                const removedItem = await this.shoppingListFunctionService.removeItemByPosition(stepContext.context.activity.conversation.id, itemToRemove.positionInShoppingList);
                if (!removedItem.ok) {
                    const couldNotRemoveItem = 'Sorry, I currently cannot remove this item. Please try again later.';
                    await stepContext.context.sendActivity(couldNotRemoveItem, couldNotRemoveItem, InputHints.IgnoringInput);
                    break;
                }
                return await stepContext.beginDialog('removeItemDialog', itemToRemove);
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
        if (stepContext.result) {
            const result = stepContext.result as Item;
            // TODO This is where calls to the Azure Functions or Shopping ListGraph API would go

            // If the call to Azure function or Shopping List Graph API is successfull, tell the user.

            const addedResult = await this.shoppingListFunctionService.addItem(stepContext.context.activity.conversation.id, result);
            console.dir(addedResult.statusText);
            if (!addedResult.ok) {
                //TODO more specific error to tell the user what was wrong.
                const couldNotAddMessage = `Sorry, I could not add ${result.itemName}`;
                await stepContext.context.sendActivity(couldNotAddMessage, couldNotAddMessage, InputHints.IgnoringInput);
            } else {
                const addedSuccessMessage = `I added ${result.itemName} to your shopping list`;
                await stepContext.context.sendActivity(addedSuccessMessage, addedSuccessMessage, InputHints.IgnoringInput);
            }
            // let message: string;
            // if (result.unit) {
            //     message = `I have added ${result.unit.value} ${result.unit.unitName} ${result.itemName} to your shopping list.`;
            // } else {
            //     message = `I have added ${result.itemName} to your shopping list.`;
            // }
            // await stepContext.context.sendActivity(message);
        }
        // Restart the main dialog waterfall with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }
}
