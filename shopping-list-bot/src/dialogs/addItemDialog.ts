import { InputHints, MessageFactory } from "botbuilder";
import { DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { IDialogResult } from "../models/dialogResult";
import { Item } from "../models/item";
import { Unit } from "../models/unit";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";
import { UnitDialog } from "./unitDialog";

/**
 * Define id's for the Dialogs the AddItemDialog is using as sub-dialogs.
 */
const TEXT_PROMPT = 'addItemTextPrompt';
const WATERFALL_DIALOG = 'addItemWaterfallDialog';
const UNIT_DIALOG = 'addItemUnitDialog';

/**
 * Represents the result an AddItemDialog returns to its parent / caller dialog once it has completed.
 * {@see IDialogResult}
 */
export interface IAddItemDialogResult extends IDialogResult {
    /**
     * The item the user wants to add based on what the AddItemDialog could find out.
     */
    itemToAdd: Item;
}

/**
 * An instance of AddItemDialog tries to ask the chat which item they want to add, taking into account the information already contained in the input item.
 * Provides an {@link IAddItemDialogResult} once completed successful.
 */
export class AddItemDialog extends CancelAndHelpDialog {

    /**
     *
     * @param {string} [id=addItemDialog] unique id in the dialog set this dialog is added to to reference this instance of {@link AddItemDialog}.
     *
     */
    constructor(id: string = 'addItemDialog') {
        super(id);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new UnitDialog(UNIT_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                // add the steps for an AddItemDialog waterfall we want to run
                this.itemNameStep.bind(this),
                this.queryUnitStep.bind(this),
                this.finalStep.bind(this)
            ]));

        // we start the waterfall dialog so it goes through the steps we defined
        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Asks the user the name of the item they want to add.
     *
     * Postcondition: Passes the name the user entered to the next step in the waterfall.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options allows to pass a partial {@link Item}. If the item contains a new the user is not asked to provide one and instead the next step is run.
     */
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

    /**
     * Ask the user for the unit (i.e. 1 kg) of the item.
     *
     * Precondition: Need name of the item to construct as input.
     * Postcondition: Passes the unit to the next step in the waterfall.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options allows to pass a partial {@link Item}. If the item contains a unit the user is not asked to provide one and instead the next step is run. Stores the item name from the previous step in this item object.
     * @param stepContext.result result of the previous step in the waterfall dialog. Needs to be name of the item the user wants to add as {@link string}.
     */
    private async queryUnitStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const itemNameResult = stepContext.result as string;
        const item = stepContext.options as Item;
        item.itemName = itemNameResult;
        if (!item.unit) {
            // pushes the unit dialog to query for a unit and continues here when the unit dialog is completed.
            return await stepContext.beginDialog(UNIT_DIALOG);
        } else {
            return await stepContext.next((item.unit));
        }
    }

    /**
     * Construct the item the user wants to add and end this dialog.
     *
     * Precondition: Need unit of the item to construct as input. Unit can be undefined.
     * Postcondition: Ends this dialog and returns the result of this dialog to the parent/caller dialog.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options allows to pass a partial {@link Item}. Stores the unit from the previous step in this item object.
     * @param stepContext.result result of the previous step in the waterfall dialog. Needs to be an {@link Unit} object that the user wants this item to be or undefined.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const unit = stepContext.result as Unit;
        const item = stepContext.options as Item;
        item.unit = unit;

        const result: IAddItemDialogResult = {
            dialogId: this.id,
            itemToAdd: item
        };

        return await stepContext.endDialog(result);
    }
}
