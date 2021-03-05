import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item, itemAsTextMessage } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

/**
 * Define id's for the Dialogs the MarkedDialog is using as sub-dialogs.
 */
const CONFIRM_PROMPT = 'markedConfirmPrompt';
const WATERFALL_DIALOG = 'markedWaterfallDialog';

/**
 * Asks the chat whether or not the bot should mark an item as completed ot not.
 */
export class MarkedDialog extends CancelAndHelpDialog {
    /**
     * 
     *@param {string} [id=markedDialog] unique id in the dialog set this dialog is added to to reference this instance of {@link MarkedDialog}.
     */
    constructor(id: string = 'markedDialog') {
        super(id);

        // Add all the dialogs we want to reference/start from within this dialog.
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                    // Define the steps we need to ask the chat which item to mark or not.
                    this.queryMarkedCompletedStatus.bind(this),
                    this.finalStep.bind(this)
            ]));

        // We start the waterfall dialog so it goes through the steps we defined
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Prompt the chat if a certain intem passed as input should be marked.
     * 
     * Postcondition: Passes true to the next step if the chat wants to mark the item as completed and false if not. Passes undefined to the next step if something went wrong.
     * @param stepContext stepContext current context/state of the conversation.
     * @param stepContext.options the {@link Item} we want to prompt the chat to tell the bot if the item should be marked as completed.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async queryMarkedCompletedStatus(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = stepContext.options as Item;
        if (item) {
            const messageText = `Should I mark ${itemAsTextMessage(item)} as complete?`;
            const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(CONFIRM_PROMPT, { prompt: message });
        } else {
            const somethingWentWrongMessage = "Ugh. I could not understand which item you want to mark. Could you please repeat?";
            await stepContext.context.sendActivity(somethingWentWrongMessage, somethingWentWrongMessage, InputHints.IgnoringInput);
            return await stepContext.next(undefined);
        }
        

    }

    /**
     * Handle receiving the result of the previous step, end this dialog and return the result to the parent dialog.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.result should be boolean indicating whether or not the user wants to mark the certain item as completed. Can be undefined.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const markedValue = stepContext.result;
        if(markedValue === undefined) {
            return await stepContext.endDialog(undefined);
        }
        return await stepContext.endDialog(markedValue as boolean);
    }
}