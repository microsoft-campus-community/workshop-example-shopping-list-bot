import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, NumberPrompt, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

const TEXT_PROMPT = 'unitTextPrompt';
const NUMBER_PROMPT = 'unitNumberPrompt';
const CONFIRM_PROMPT = 'unitConfirmPrompt';
const WATERFALL_DIALOG = 'unitWaterfallDialog';

export class UnitDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'unitDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new NumberPrompt(NUMBER_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.wantsUnit.bind(this),
                this.wantsUnitResult.bind(this),
                this.queryUnitName.bind((this)),
                this.queryUnitValue.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async wantsUnit(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const messageText = 'Do you want to add a unit, e.g. 5 kg?';
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: message });
    }

    private async wantsUnitResult(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const wantsUnit = stepContext.result as boolean;
        if (wantsUnit) {
            return await stepContext.next();
        } else {
            return await stepContext.endDialog();
        }
    }

    private async queryUnitName(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const messageText = 'Which unit (e.g. kg)?';
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: message });

    }

    private async queryUnitValue(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unit = stepContext.result as string;
        (stepContext.options as Unit).unitName = unit;
        const messageText = `How many ${unit} (e.g. 500)?`;
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(NUMBER_PROMPT, { prompt: message });
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unitValue = stepContext.result as number;
        (stepContext.options as Unit).value = unitValue;
        return await stepContext.endDialog(stepContext.options);
    }
}
