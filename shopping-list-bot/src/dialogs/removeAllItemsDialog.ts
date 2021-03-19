import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

/**
 * Define id's for the Dialogs the {@link RemoveAllItemsDialog} is using as sub-dialogs.
 */
const TEXT_PROMPT = 'removeAllItemsTextPrompt';
const CONFIRM_PROMPT = 'removeAllItemsConfirmPrompt';
const WATERFALL_DIALOG = 'removeAllItemsWaterfallDialog';

/**
 * Dialog to make sure that the chat really wants to remove all items.
 */
export class RemoveAllItemsDialog extends CancelAndHelpDialog {

    /**
     * 
     * @param {string} [id=removeAllItemsDialog] unique id in the dialog set this dialog is added to to reference this instance of {@link RemoveAllItemsDialog}. 
     */
    constructor(readonly id: string = 'removeAllItemsDialog') {
        super(id);

        // Create all the dialogs the RemoveAllItemsDialog uses.
        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                // Define the steps for an RemoveAllItemsDialog waterfall we want to run
                this.removeStep.bind(this),
                this.finalStep.bind(this)
            ]));

        // We start the waterfall dialog so it goes through the steps we defined.
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Ask the chat if they really want to remove all items.
     * 
     * Precondition: Nothing
     * 
     * Postcondition: Passes true to the next step if the chat wants to remove all items and false if they do not want to remove all items.
     * @param stepContext current context/state of the conversation.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async removeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const questionText = 'Do you want to remove all Items?';
        const answerMessage = MessageFactory.text(questionText, questionText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: answerMessage });
    }

    /**
     * Ends this dialog and returns whether or not to remove all items to the parent / caller dialog.
     * 
     * Precondition: Needs to get whether or not to remove all items as input from the previous step.
     * 
     * Postcondition: Ends the dialog. Returns true to parent dialog if all items should be removed and false if not.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options should be true if chat wants to remove all items and false if not.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        return await stepContext.endDialog(stepContext.options as boolean);
    }


}