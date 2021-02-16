import { AdaptiveCard, TextBlock, Version } from "adaptivecards";
import { Template } from "adaptivecards-templating";
import { ActivityFactory, Attachment, AttachmentLayout, CardFactory, InputHints, MessageFactory } from "botbuilder";
import { AttachmentPrompt, DialogTurnResult, DialogTurnStatus, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { adaptiveCardsAvailable } from "../helpers/adaptiveCardsAvailable";
import { Item } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { LoopItemsDialog } from "./loopItemsDialog";
const ShoppingListCard = require('../../resources/shoppingListCard.json');


const ATTACHMENT_PROMPT = 'getAllItemsAttachmentPrompt';
const WATERFALL_DIALOG = 'getAllItemsWaterfallDialog';
const LOOP_ITEMS_DIALOG = 'getAllItemsLoopItemsDialog';

export class GetAllItemsDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'getAllItemsDialog');

        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT))
            .addDialog(new LoopItemsDialog(LOOP_ITEMS_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.showItemsStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async showItemsStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const items = stepContext.options as Item[];
        if (items) {
            if (items.length === 0) {
                const emptyShoppingList = 'Your shopping list is empty. To add an item say something like "Add 5 bananas to my shopping list."';
                await stepContext.context.sendActivity(emptyShoppingList, emptyShoppingList, InputHints.IgnoringInput);
            } else {
                items.sort((first, second) => first.positionInShoppingList - second.positionInShoppingList);
                const channelId = stepContext.context.activity.channelId;
                if (channelId && adaptiveCardsAvailable(channelId)) {
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
                    const shoppingListTitle = 'Here are the items on your shopping list. You can check them off by something like "Mark first item as checked"';
                    await stepContext.context.sendActivity(shoppingListTitle, shoppingListTitle, InputHints.IgnoringInput);
                    return await stepContext.beginDialog(LOOP_ITEMS_DIALOG, items);

               }


            }
        } else {
            const couldNotGetItems = 'Sorry, I can not get all items in your shopping list currently. Please try again later.';
            await stepContext.context.sendActivity(couldNotGetItems, couldNotGetItems, InputHints.IgnoringInput);
        }

        return await stepContext.next();
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // TODO react to possible adaptive card response save
        return stepContext.endDialog();
    }
}