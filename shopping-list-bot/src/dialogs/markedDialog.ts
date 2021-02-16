import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item, itemAsTextMessage } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

const CONFIRM_PROMPT = 'markedConfirmPrompt';
const WATERFALL_DIALOG = 'markedWaterfallDialog';


export class MarkedDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'markedDialog');

        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                    this.queryMarkedCompletedStatus.bind(this),
                    this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;

    }

    private async queryMarkedCompletedStatus(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = stepContext.options as Item;
        let messageText = 'Should I mark item as complete?';
        if (item) {
            messageText = `Should I mark ${itemAsTextMessage(item)} as complete?`;
        }
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: message });

    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const markedValue = stepContext.result as boolean;
        return await stepContext.endDialog(markedValue);
    }
}