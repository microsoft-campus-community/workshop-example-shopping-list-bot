import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";


const TEXT_PROMPT = 'queryItemNameOrPositionTextPrompt';
const WATERFALL_DIALOG = 'queryItemNameOrPositionWaterfallDialog';

export class QueryItemNameOrPositionDialog extends CancelAndHelpDialog {
    private question = '';

    constructor(id: string, question: string) {
        super(id || 'queryItemNameOrPositionDialog');
        this.addDialog(new TextPrompt(this.getTextPromptId()))
            .addDialog(new WaterfallDialog(this.getWaterfallDialogId(), [
                this.whichItemToMark.bind(this),
                this.finalStep.bind(this)
            ]));

        this.question = question;

        this.initialDialogId = this.getWaterfallDialogId();
    }


    private getWaterfallDialogId(): string {
        return this.id + WATERFALL_DIALOG;
    }

    private getTextPromptId(): string {
        return this.id + TEXT_PROMPT;
    }

    private async whichItemToMark(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = stepContext.options as Item;
        if (item.itemName) {
            return await stepContext.next(item.itemName);
        } else if ((item.positionInShoppingList && item.positionInShoppingList > 0)) {
            return await stepContext.next(item.positionInShoppingList);
        } else {
            const messageText = this.question;
            const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(this.getTextPromptId(), { prompt: message });
        }
    }


    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const inputItem = stepContext.result as string;
        const positionOfItem = parseInt(inputItem);
        const item = new Item();
        //TODO call function to mark item
        if (isNaN(positionOfItem)) {
            item.itemName = inputItem;
        } else {
            item.positionInShoppingList = positionOfItem;
        }
        console.log("[DEBUG] query item dialog completed with:");
        console.dir(item);

        return await stepContext.endDialog(item);

    }
}