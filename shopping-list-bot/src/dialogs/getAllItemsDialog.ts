import { AdaptiveCard, TextBlock, Version } from "adaptivecards";
import { ActivityFactory, Attachment, AttachmentLayout, CardFactory, InputHints, MessageFactory } from "botbuilder";
import { AttachmentPrompt, DialogTurnResult, DialogTurnStatus, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
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
        //TODO call to function
        const messageText = 'Plain text is ok, but sometimes I long for more...';
        const itemsAdaptiveCard = new AdaptiveCard();
        itemsAdaptiveCard.version = new Version(1, 0);
        
        const textBlock = new TextBlock();
        textBlock.text = "Hello World";
        itemsAdaptiveCard.addItem(textBlock);
        const itemsAdaptiveCardAttachment = CardFactory.adaptiveCard(itemsAdaptiveCard);
        console.dir(itemsAdaptiveCard);
        console.dir(itemsAdaptiveCardAttachment);
        const card = CardFactory.adaptiveCard(ShoppingListCard);
        

       // const message = MessageFactory.attachment(itemsAdaptiveCardAttachment, messageText, messageText);
        //  return await stepContext.prompt(ATTACHMENT_PROMPT, {prompt: message});
        await stepContext.context.sendActivity({ text: messageText,attachments: [itemsAdaptiveCardAttachment]});
        return stepContext.endDialog();
    }
}