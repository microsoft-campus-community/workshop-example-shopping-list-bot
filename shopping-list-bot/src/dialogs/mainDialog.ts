import { InputHints, MessageFactory, StatePropertyAccessor, TurnContext } from 'botbuilder';
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
import { IDialogResult } from '../models/dialogResult';
import { Item, itemAsTextMessage } from '../models/item';
import { FunctionService } from '../services/functionsService';
import { AddItemDialog, IAddItemDialogResult } from './addItemDialog';
import { GetAllItemsDialog } from './getAllItemsDialog';
import { IQueryItemIdDialogInput, IQueryItemIdDialogResult, QueryItemIdDialog } from './queryItemIdDialog';
import { RemoveAllItemsDialog } from './removeAllItemsDialog';
import { ShoppingListRecognizer } from './shoppingListRecognizer';


/**
 * Define id for the waterfall dialog we want to use in this dialog. With this id we can reference the waterfall dialog.
 */
const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

/**
 * This Dialog represents the main conversation logic of the bot.
 */
export class MainDialog extends ComponentDialog {
    /**
     * Used to make request for the LUIS API when receiving activities.
     */
    private luisRecognizer: ShoppingListRecognizer;
    /**
     * Used to call the Shopping List Azure Functions which contain the logic for the shopping list.
     */
    private shoppingListFunctionService: FunctionService;

    /**
     * Creates a new main dialog with the is 'MainDialog'
     * @param luisRecognizer used for calling the LUIS API to predict intents and entities in messages.
     * @param addItemDialog to run when the user wants to add an item to the shoppings list.
     * @param getAllItemsDialog to run when the user wants to retrieve all items from the shopping list.
     * @param markItemDialog to run when the user wants to mark an item as completed in the shopping list.
     * @param unmarkItemDialog to run when the user wants to mark an item as NOT completed in the shopping list.
     * @param removeSingleItemDialog to run when the user wants to remove one item from the list.
     * @param removeAllItemsDialog to run when the user wants to remove all items in the list of this chat.
     * @param shoppingListFunctionService used to call the API for the shopping list.
     */
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

        // we start the waterfall dialog so it goes through the steps we defined
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
     * 
     * Precondition: The LUIS Recognizer needs to be configured correctly.
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
     * Second step in the waterall.  
     * This will use LUIS to attempt to extract intent of the command the user sends and any items in the message of the user in case the command can receive some input.
     * Then, it hands off to the appropriate child dialog to process the command.
     */
    private async actStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = new Item();

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the AddItemDialog path.
            return await stepContext.beginDialog('addItemDialog', item);
        }

        // Call LUIS and gather any potential shopping list related input. (Note the TurnContext has the response to the prompt)
        TurnContext.removeRecipientMention(stepContext.context.activity);
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        
        
        const conversationId = stepContext.context.activity.conversation.id;

        /**
         * Find out which intent LUIS could recognize and start the appropriate child dialog which might require getting some data first.
         */
        switch (LuisRecognizer.topIntent(luisResult)) {
            case 'AddItem':
                // If LUIS could recognize any input for the AddItemDialog we will pass it as input otherwise the LUIS result can not help the AddItemDialog.
                const itemName = this.luisRecognizer.getItemNameEntities(luisResult);
                const unit = this.luisRecognizer.getUnitEntities(luisResult);
                item.itemName = itemName;
                item.unit = unit;
                return await stepContext.beginDialog('addItemDialog', item);
            case 'GetAll':
                // The user wants to get all items in the shopping list. Hence we need to retrieve all items from the shopping list API first.
                const itemsResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);

                if (!itemsResponse.ok) {
                    const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
                // We could get something from the shopping list API that the GetAllItemsDialog can figure out how to display.
                const allItems = await itemsResponse.json() as Item[];
                return await stepContext.beginDialog('getAllItemsDialog', allItems);
            case 'MarkItem':
                // Parse the LUIS response to find out which item the user wants to mark as completed.
                const itemToMark = this.luisRecognizer.getItemWithNameOrPosition(luisResult);

                // Get all items in the shopping list to present the user which item they can mark.
                const itemsInShoppingListMarkResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);
                
                if (!itemsInShoppingListMarkResponse.ok) {
                    // Error handling for when the item the user specified can not be marked.
                    const couldNotGetItems = `Sorry, I can not mark ${itemAsTextMessage(itemToMark)} as completed. Please try again later.`;
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }
         
                // We could successfully mark the item as completed. Let the user know about that.
                const itemsInShoppingListMark = await itemsInShoppingListMarkResponse.json() as Item[];
                const markItemInput: IQueryItemIdDialogInput = {
                    itemsInList: itemsInShoppingListMark,
                    itemToFindInList: itemToMark
                }
                return stepContext.beginDialog('markItemDialog', markItemInput);
            case 'UnmarkItem':
                // Parse the LUIS response to find out which item the user wants to mark as NOT completed.
                const itemToUnmark = this.luisRecognizer.getItemWithNameOrPosition(luisResult);

                // Get all items in the shopping list to present the user which item they can mark.
                const itemsInShoppingListUnmarkResponse = await this.shoppingListFunctionService.getItemsInShoppingList(conversationId);
                
                if (!itemsInShoppingListUnmarkResponse.ok) {              
                    // Error handling for when the item the user specified can not be unmarked.
                    const couldNotGetItems = `Sorry, I can not mark ${itemAsTextMessage(itemToUnmark)}. Please try again later.`;
                    await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
                    break;
                }

                // We could successfully mark the item as not completed. Let the user know about that.
                const itemsInShoppingListUnmark = await itemsInShoppingListUnmarkResponse.json() as Item[];
                const unmarkItemInput: IQueryItemIdDialogInput = {
                    itemsInList: itemsInShoppingListUnmark,
                    itemToFindInList: itemToUnmark
                }
                return await stepContext.beginDialog('unmarkItemDialog', unmarkItemInput);
            case 'RemoveAll':
                // Call the list API to delete all item in the list of this conversation.
                const response = await this.shoppingListFunctionService.removeAllItems(conversationId);
                if (!response.ok) {
                    const couldNotRemoveItems = 'Sorry, I currently cannot remove all items. Please try again later.';
                    await stepContext.context.sendActivity(couldNotRemoveItems, couldNotRemoveItems, InputHints.IgnoringInput);
                    break;
                }
                return await stepContext.beginDialog('removeAllItemsDialog');
            case 'RemoveItem':
                // Find out which item the user wants to remove by parsing the LUIS response.
                const itemToRemove = this.luisRecognizer.getItemWithNameOrPosition(luisResult);

                // Get all items in the shopping list to present the user which item they can remove.
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
        
        // Let the bot framework take over again. It will call the next step in this waterfall dialog when appropriate.
        return await stepContext.next();
    }


   

    /**
     * This is the final step in the main waterfall dialog.
     * It processes the result of any child dialog we called.
     * Restarts the main dialog.
     * @param stepContext.result can contain a result from a child dialog. 
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (stepContext.result) {
            const conversationId = stepContext.context.activity.conversation.id;
            const dialogResult = stepContext.result as IDialogResult;
            /**
             * Depeding on which child dialog returned we want to process the results differently.
             */
            switch (dialogResult.dialogId) {
                case 'addItemDialog':
                    /**
                     * After the AddItemDialog has figured out which item the user wants to add we still need to add the item to the list.
                     */
                    const addItemDialogResult = dialogResult as IAddItemDialogResult;
                    const itemToAdd = addItemDialogResult.itemToAdd;
                    
                    // Default message in case of an error.
                    let itemAddedMessage = 'Something went wrong trying to add an item.';

                    if (itemToAdd) {
                        // Call the shopping list API for adding an item.
                        const addedResult = await this.shoppingListFunctionService.addItem(conversationId, itemToAdd);
                        if (!addedResult.ok) {
                            itemAddedMessage = `Sorry, I could not add ${itemAsTextMessage(itemToAdd)}`;
                        } else {
                            itemAddedMessage = `I added ${itemAsTextMessage(itemToAdd)} to your shopping list`;
                        }
                    }

                    await stepContext.context.sendActivity(itemAddedMessage, itemAddedMessage, InputHints.IgnoringInput);
                    break;
                case 'markItemDialog':
                    /**
                     * The MarkItemDialog figures out which item the user wants to mark as complete. Now we still need to mark this item as completed.
                     */
                    const markItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    let message = "Sorry, something went wrong trying to mark an item in your shopping list as complete.";
                    if (markItemDialogResult && markItemDialogResult.foundItemId) {
                        const patchedItemMark: Partial<Item> = {
                            id: markItemDialogResult.foundItemId,
                            marked: true
                        }
                        // Call the shooping list API to actually mark the item as completed.
                        const patchedItemMarkResponse = await this.shoppingListFunctionService.patchItemInShoppingList(conversationId, patchedItemMark);
                        if (!patchedItemMarkResponse.ok) {

                            message = `Sorry, I could not mark the item as complete.`;

                        } else {
                            message = 'I was successful marking the item in your shopping list as complete';

                        }
                    }
                    await stepContext.context.sendActivity(message, message, InputHints.IgnoringInput);
                    break;
                case 'removeItemDialog':
                    /**
                     * After the RemoveItemDialog has figured out which item the user wants to remove and returned it to us we still need to remove the item.
                     */
                    const removeItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    let removeMessage = "Sorry, something went wrong deleting one item.";
                    if (removeItemDialogResult && removeItemDialogResult.foundItemId) {
                        // Call the list API to delete the specific item.
                        const removeItemServiceResponse = await this.shoppingListFunctionService.removeItemByID(conversationId, removeItemDialogResult.foundItemId);
                        if (removeItemServiceResponse.ok) {
                            removeMessage = 'I deleted the item from the shopping list for you.';

                        }
                    }
                    await stepContext.context.sendActivity(removeMessage, removeMessage, InputHints.IgnoringInput);
                    break;
                case 'unmarkItemDialog':
                    /**
                     * Through the result of the UnmarkItemDialog we know which item the user wants to mark as NOT completed. Now we need to do the work so the user is satisfied.
                     */
                    const unmarkItemDialogResult = dialogResult as IQueryItemIdDialogResult;
                    let unmarkMessage = "Sorry, something went wrong trying to change an item in your shopping list as not complete.";
                    if (unmarkItemDialogResult && unmarkItemDialogResult.foundItemId) {
                        const patchedItemUnmark: Partial<Item> = {
                            id: unmarkItemDialogResult.foundItemId,
                            marked: false
                        }
                        // Call the shooping list API to actually unmark the item as completed.
                        const patchedItemUnmarkResponse = await this.shoppingListFunctionService.patchItemInShoppingList(conversationId, patchedItemUnmark);
                        if (!patchedItemUnmarkResponse.ok) {
                                unmarkMessage = `Sorry, I could not update the item as not complete.`;
                            
                        } else {
                                unmarkMessage = 'I was successful marking the item in your shopping list as not complete';
                            
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
