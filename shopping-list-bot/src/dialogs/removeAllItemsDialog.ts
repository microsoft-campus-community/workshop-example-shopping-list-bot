import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item } from "../models/item";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { UnitDialog } from "./unitDialog";

const TEXT_PROMPT = 'removeAllItemsTextPrompt';
const CONFIRM_PROMPT = 'removeAllItemsConfirmPrompt';
const WATERFALL_DIALOG = 'removeAllItemsWaterfallDialog';

export class RemoveAllItemsDialog extends CancelAndHelpDialog {
    constructor(readonly id: string) {
        super(id || 'aemoveAllItemsDialogddItemDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.removeStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async removeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const questionText = 'Do you want to remove all Items?';
        const answerMessage = MessageFactory.text(questionText, questionText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: answerMessage });
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // TODO call action to remove all items here!
        console.log('[DEBUG] Removed all items');
        return await stepContext.endDialog(stepContext.options);
    }


}