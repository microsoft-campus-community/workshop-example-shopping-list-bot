import { InputHints, MessageFactory } from "botbuilder";
import { DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { IDialogResult } from "../models/dialogResult";
import { Item } from "../models/item";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { UnitDialog } from "./unitDialog";

const TEXT_PROMPT = 'addItemTextPrompt';
const WATERFALL_DIALOG = 'addItemWaterfallDialog';
const UNIT_DIALOG = 'addItemUnitDialog';

export interface IAddItemDialogResult extends IDialogResult {
    itemToAdd: Item;
}

export class AddItemDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'addItemDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new UnitDialog(UNIT_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.itemNameStep.bind(this),
                this.queryUnitStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async itemNameStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // TODO Implement here!
        return null;
    }

    private async queryUnitStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // TODO Implement here!
        return null;
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // TODO Implement here!
        return null;
    }
}
