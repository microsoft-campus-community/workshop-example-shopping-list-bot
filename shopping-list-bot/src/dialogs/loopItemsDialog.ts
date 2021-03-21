import { InputHints } from "botbuilder";
import { DialogTurnResult, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item, itemAsTextMessage } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

/**
 * Define id for the waterfall dialog we want to use in this dialog. With this id we can reference the waterfall dialog.
 */
const WATERFALL_DIALOG = 'loopItemsWaterfallDialog';

/**
 * Dialog loops over all items in an array and displays each item.
 */
export class LoopItemsDialog extends CancelAndHelpDialog {
    constructor(id: string = 'loopItemsDialog') {
        super(id);

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            // add the steps for an LoopItemsDialog waterfall we want to run
            this.loopStep.bind(this)
        ]));

        // we start the waterfall dialog so it goes through the steps we defined
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Displays all items in the array received as input.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options should be the items that should be displayed as input.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async loopStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const items = stepContext.options as Item[];
        if (items && items.length > 0) {
            // we have at least one item to display.
            const currentItemToDisplay = items.shift();
            const markedEmoji = currentItemToDisplay.marked ? '✔️' : '⭕';
            const itemAsMessage = `${markedEmoji} ${itemAsTextMessage(currentItemToDisplay)}`;
            await stepContext.context.sendActivity(itemAsMessage, itemAsMessage, InputHints.IgnoringInput);
            
            // Repeat this dialog with the remaining items.
            return await stepContext.replaceDialog(this.id, items);
        }
        // no more items in the array so we can end the loop.
        return await stepContext.endDialog();
    }
}