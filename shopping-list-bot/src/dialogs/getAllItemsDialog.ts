import { AdaptiveCard } from "adaptivecards";
import { Template } from "adaptivecards-templating";
import { CardFactory, InputHints } from "botbuilder";
import { AttachmentPrompt, DialogTurnResult, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { adaptiveCardsAvailable } from "../helpers/adaptiveCardsAvailable";
import { Item } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { LoopItemsDialog } from "./loopItemsDialog";

/**
 * Import the Adaptive Card payload used to display the items in the list.
 */
const ShoppingListCard = require('../../resources/shoppingListCard.json');

/**
 * Define id's for the Dialogs the GetAllItemsDialog is using as sub-dialogs.
 */
const ATTACHMENT_PROMPT = 'getAllItemsAttachmentPrompt';
const WATERFALL_DIALOG = 'getAllItemsWaterfallDialog';
const LOOP_ITEMS_DIALOG = 'getAllItemsLoopItemsDialog';

/**
 * Dialog to display given items in the shopping list to the chat.
 */
export class GetAllItemsDialog extends CancelAndHelpDialog {
    /** 
     * @param id {string} [id=getAllItemsDialog] unique id in the dialog set this dialog is added to to reference this instance of {@link GetAllItemsDialog}.
     */
    constructor(id: string =  'getAllItemsDialog') {
        super(id);

        // add all the dialogs we need within this dialog
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT))
            .addDialog(new LoopItemsDialog(LOOP_ITEMS_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                // add the steps for an AddItemDialog waterfall we want to run
                this.showItemsStep.bind(this),
                this.finalStep.bind(this)
            ]));
        // we start the waterfall dialog so it goes through the steps we defined
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Shows the items this dialog receives.
     * 
     * Only handels the sending the appropriate message depending on the items. Does not have any logic to get the items.
     *  
     * Precondition: If items should be displayed they need to be passed through the step context.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options should be an array of items. Can be undefined or empty array.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     * 
     */
    private async showItemsStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const items = stepContext.options as Item[];
        if (items) {
            if (items.length === 0) {
                const emptyShoppingList = 'Your shopping list is empty. To add an item say something like "Add 5 bananas to my shopping list."';
                await stepContext.context.sendActivity(emptyShoppingList, emptyShoppingList, InputHints.IgnoringInput);
            } else {
                // we sort the item so they are in the appropriate oredr to enable the user to write the position of an item in the list with a command and the bot and the user have the same view on which item is referenced by the position.
                items.sort((first, second) => first.positionInShoppingList - second.positionInShoppingList);
                const channelId = stepContext.context.activity.channelId;
               if (channelId && adaptiveCardsAvailable(channelId)) {
                   // we can savely send an adaptive card to diaplay the items
                    const shoppingListAdaptiveCardTemplate = new Template(ShoppingListCard);
                    const currentShoppingListPayload = shoppingListAdaptiveCardTemplate.expand({
                        $root: {
                            title: "Shopping List",
                            items: items.map(item =>  {return {
                                itemName: item.itemName,
                                marked: item.marked.toString(),
                                unit: item.unit, 
                                id: item.id
                            }})
                        }
                    });

                    const shoppingListAdaptiveCard = new AdaptiveCard();
                    shoppingListAdaptiveCard.parse(currentShoppingListPayload);
                    const itemsAdaptiveCardAttachment = CardFactory.adaptiveCard(shoppingListAdaptiveCard);
                    await stepContext.context.sendActivity({ attachments: [itemsAdaptiveCardAttachment] });
                } else {
                    // adaptive cards are not available in this channel / chat app so we need to send a text based list
                    const shoppingListTitle = 'Here are the items on your shopping list. You can check them off by something like "Mark first item as checked"';
                    await stepContext.context.sendActivity(shoppingListTitle, shoppingListTitle, InputHints.IgnoringInput);
                    return await stepContext.beginDialog(LOOP_ITEMS_DIALOG, items);
               }


            }
        } else {
            const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
            await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
        }

        // continue with the next step in the waterfall dialog.
        return await stepContext.next();
    }

    /**
     * End this dialog.
     * @param stepContext current context/state of the conversation.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        return stepContext.endDialog();
    }
}