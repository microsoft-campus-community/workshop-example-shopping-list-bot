import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Item } from "../models/item";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { UnitDialog } from "./unitDialog";

const TEXT_PROMPT = 'addItemTextPrompt';
const CONFIRM_PROMPT = 'addItemConfirmPrompt';
const WATERFALL_DIALOG = 'addItemWaterfallDialog';
const UNIT_DIALOG = 'addItemUnitDialog';

export class AddItemDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'addItemDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new UnitDialog(UNIT_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.itemNameStep.bind(this),
                this.queryUnitStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async itemNameStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = stepContext.options as Item;

        if (!item.itemName) {
            const messageText = 'Which item would you like to add?';
            const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: message });
        } else {
            return await stepContext.next(item.itemName);
        }
    }

    private async queryUnitStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const entity = stepContext.result as string;
        const item = stepContext.options as Item;
        item.itemName = entity;
        console.dir(item);
        if (!item.unit) {
            console.log("line 47");
            return await stepContext.beginDialog(UNIT_DIALOG);
        } else {
            return await stepContext.next((item.unit));
        }
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unit = stepContext.result as Unit;
        (stepContext.options as Item).unit = unit;
        return await stepContext.endDialog(stepContext.options);
    }
}
