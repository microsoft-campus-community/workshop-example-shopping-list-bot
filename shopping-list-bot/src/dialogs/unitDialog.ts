import { InputHints, MessageFactory } from "botbuilder";
import { ConfirmPrompt, DialogTurnResult, NumberPrompt, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

/**
 * Define id's for the Dialogs the {@link UnitDialog} is using as sub-dialogs.
 */
const TEXT_PROMPT = 'unitTextPrompt';
const NUMBER_PROMPT = 'unitNumberPrompt';
const CONFIRM_PROMPT = 'unitConfirmPrompt';
const WATERFALL_DIALOG = 'unitWaterfallDialog';

/**
 * Dialog to find out if the chat wants to provide information for a {@link Unit}.
 * If so then collects the information to construct a unit from the chat.
 */
export class UnitDialog extends CancelAndHelpDialog {
    /**
     * 
     * @param id {string} [id=unitDialog] unique id in the dialog set this dialog is added to to reference this instance of {@link UnitDialog}.
     */
    constructor(id: string = 'unitDialog') {
        super(id);

        // Add all the dialogs we need to use within this dialog.
        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new NumberPrompt(NUMBER_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                // Add the steps for an UnitDialog waterfall we want to run
                this.wantsUnit.bind(this),
                this.wantsUnitResult.bind(this),
                this.queryUnitName.bind((this)),
                this.queryUnitValue.bind(this),
                this.finalStep.bind(this)
            ]));

        // We start the waterfall dialog so it goes through the steps we defined.
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * First step in this dialog.
     * Asks the chat whether or not they want to provide an {@link Unit}.
     * 
     * Precondition: Nothing
     * Postcondition: Passes true to the next step if the chat want to provide inforamtion for an {@link Unit} and false if they do not want to.
     * @param stepContext current context/state of the conversation.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async wantsUnit(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const messageText = 'Do you want to add a unit, e.g. 5 kg?';
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: message });
    }

    /**
     * Second step in this dialog.
     * If chat does not want to provide information for an {@link Unit} then this dialog ends.
     * If chat wants to provide an {@link Unit} than start asking the chat to provide information about the {@link Unit}.
     * 
     * Precondition: Needs to get a boolean value from the previous step that indicates whether or not to start asking for the information to construct an {@link Unit}.
     * Postcondition: Calls the next step in the waterfall or ends the dialog.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.result should be a boolean to indicate whether or not the chat wants to provide information for an {@link Unit}.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async wantsUnitResult(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const wantsUnit = stepContext.result as boolean;
        if (wantsUnit) {
            return await stepContext.next();
        } else {
            return await stepContext.endDialog();
        }
    }

    /**
     * Third step in this dialog.
     * Ask the chat about the name of an {@link Unit}.
     * 
     * Precondition: Nothing.
     * Postcondition: Passes a {@link string} which is the name of the {@link Unit} to the next step.
     * @param stepContext current context/state of the conversation.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async queryUnitName(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const messageText = 'Which unit (e.g. kg)?';
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: message });

    }

    /**
     * Fourth step in this dialog.
     * Ask the chat for the value of the {@link Unit} to construct.
     * 
     * Precondition: Need to receive the name of the {@link Unit} from the previous step.
     * Postcondition: Passes a number which should be interpreted as the value for the {@link Unit} to the next step. Stores the name of the {@link Unit} in stepContext.options.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.result {@link string} which is interpreted as the name of the {@link Unit}.
     * @param stepContext.options should be the {@link Unit} we are constucting and passing along through the waterfall.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async queryUnitValue(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unit = stepContext.result as string;
        (stepContext.options as Unit).unitName = unit;
        const messageText = `How many ${unit} (e.g. 500)?`;
        const message = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(NUMBER_PROMPT, { prompt: message });
    }

    /**
     * Last step in this dialog.
     * Returns the {@link Unit} we constructed to the parent / caller dialog and ends this dialog.
     * 
     * Precondition: The previous step should pass a {@link number} to this step which represent the value for the {@link Unit}. Additionally, stepContext.options should be an {@link Unit} object with all the information gathered in the previous steps.
     * @param stepContext.result should be a {@link number} that is interpreted as the value for the {@link Unit}.
     * @param stepContext.options should contain all the information of the {@link Unit} we are constructing.
     * @param stepContext current context/state of the conversation.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unitValue = stepContext.result as number;
        (stepContext.options as Unit).value = unitValue;
        return await stepContext.endDialog(stepContext.options);
    }
}
