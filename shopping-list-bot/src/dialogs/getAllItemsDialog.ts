import { AdaptiveCard, TextBlock, Version } from "adaptivecards";
import { Template } from "adaptivecards-templating";
import { ActivityFactory, Attachment, AttachmentLayout, CardFactory, InputHints, MessageFactory } from "botbuilder";
import { AttachmentPrompt, DialogTurnResult, DialogTurnStatus, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
const ShoppingListCard = require('../../resources/shoppingListCard.json');


const ATTACHMENT_PROMPT = 'getAllItemsAttachmentPrompt';
const WATERFALL_DIALOG = 'getAllItemsWaterfallDialog';

export class GetAllItemsDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'getAllItemsDialog');

        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.showItemsStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async showItemsStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        //TODO call to function to get shopping list items
        const items = new Array<Item>();
        items.push({
            intent: "",
            itemName: "Banana",
            unit: {
                unitName: "kg",
                value: 2
            },
            positionInShoppingList: 1,
            marked: false
        });
       const shoppingListAdaptiveCardTemplate = new Template(ShoppingListCard);
       const currentShoppingListPayload = shoppingListAdaptiveCardTemplate.expand({
            $root:{
                title: "Shopping List",
                items: items
            }
        });
        const shoppingListAdaptiveCard = new AdaptiveCard();
        shoppingListAdaptiveCard.parse(currentShoppingListPayload);
        const itemsAdaptiveCardAttachment = CardFactory.adaptiveCard(shoppingListAdaptiveCard);




         await stepContext.context.sendActivity({ attachments: [itemsAdaptiveCardAttachment]});
        return stepContext.endDialog();
    }
}