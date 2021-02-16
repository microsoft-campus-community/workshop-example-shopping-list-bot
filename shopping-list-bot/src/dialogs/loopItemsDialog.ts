import { AdaptiveCard, TextBlock, Version } from "adaptivecards";
import { Template } from "adaptivecards-templating";
import { ActivityFactory, Attachment, AttachmentLayout, CardFactory, InputHints, MessageFactory } from "botbuilder";
import { AttachmentPrompt, DialogTurnResult, DialogTurnStatus, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { adaptiveCardsAvailable } from "../helpers/adaptiveCardsAvailable";
import { Item, itemAsTextMessage } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";


const WATERFALL_DIALOG = 'loopItemsWaterfallDialog';

export class LoopItemsDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'loopItemsDialog');
        
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.loopStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async loopStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const items = stepContext.options as Item[];
        if(items && items.length > 0) {
            const currentItemToDisplay = items.shift();
            const markedEmoji = currentItemToDisplay.marked?  '✔️': '⭕' ;    
            const itemAsMessage = `${markedEmoji} ${itemAsTextMessage(currentItemToDisplay)}`;
            await stepContext.context.sendActivity(itemAsMessage, itemAsMessage, InputHints.IgnoringInput);
            // Repeat this dialog with the remaining items.
            return await stepContext.replaceDialog(this.id, items);
    
        }
        return await stepContext.endDialog();
       
    }
}