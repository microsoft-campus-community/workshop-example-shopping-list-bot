import { Choice, ChoicePrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { IDialogResult } from "../models/dialogResult";
import { findItemInList, Item, itemAsTextMessage } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";

/**
 * Define id's for the Dialogs the {@link QueryItemIdDialog} is using as sub-dialogs.
 */
const TEXT_PROMPT = 'queryItemIdTextPrompt';
const WATERFALL_DIALOG = 'queryItemIdWaterfallDialog';
const CHOICE_DIALOG = 'queryItemIdChoiceDialog';

/**
 * What the {@link QueryItemIdDialog} expects as input when it is started.
 */
export interface IQueryItemIdDialogInput {
    /**
     * Known information about the item that should be searched for in {@link itemsInList}.
     */
    itemToFindInList: Partial<Item>,
    /**
     * List of items to search through.
     */
    itemsInList: Item[]
}

/**
 * The result {@link QueryItemIdDialog} returns to its parent/caller dialog.
 */
export interface IQueryItemIdDialogResult extends IDialogResult {
    foundItemId: string
}

/**
 * Dialog to find a certain item in an array of items based on known information. Triages the user for additional input if more information is needed to identify the item or if nothing is known about the item in advance.
 */
export class QueryItemIdDialog extends CancelAndHelpDialog {
    private question = '';

    /**
     * 
     * @param {string} [id=queryItemIdDialog] to reference this dialog by.
     * @param question to ask the user when triaging for more information about the item to search. This is optional and can be used to provide more context in the message to why the user should select an item from the array of items.
     * 
     */
    constructor(id: string = 'queryItemIdDialog', question?: string) {
        super(id);

        // Add all the dialogs we need within this dialog
        this.addDialog(new TextPrompt(this.getTextPromptId()))
            .addDialog(new ChoicePrompt(this.getChoicePromptId()))
            .addDialog(new WaterfallDialog(this.getWaterfallDialogId(), [
                // Add the steps for an QueryItemIdDialog waterfall we want to run
                this.whichItemInformationExists.bind(this),
                this.finalStep.bind(this)
            ]));
        if(question) {
            if(question.endsWith(' ')) {
                this.question = question;
            } else {
                this.question = `${question} `;
            }
        }

        // We start the waterfall dialog so it goes through the steps we defined
        this.initialDialogId = this.getWaterfallDialogId();
    }

    /**
     * 
     * @returns the id of the waterfall dialog of this instance of QueryItemIdDialog to reference it.
     */
    private getWaterfallDialogId(): string {
        return this.id + WATERFALL_DIALOG;
    }

    /**
     * 
     * @returns the id of the text prompt dialog of this instance of QueryItemIdDialog to reference it.
     */
    private getTextPromptId(): string {
        return this.id + TEXT_PROMPT;
    }

    /**
     * 
     * @returns the id of the choice prompt dialog of this instance of QueryItemIdDialog to reference it.
     */
    private getChoicePromptId(): string {
        return this.id + CHOICE_DIALOG;
    }


    /**
     * First step in a QueryItemIdDialog.
     * If enough information for the bot to identify the item the chat wants to select we can silently select that item.
     * If more information about which item to select from the chat is needed the bot asks for it.
     * 
     * Precondition: Need to receive input as defined with {@link IQueryItemIdDialogInput}.
     * 
     * Postcondition: The next step will receive the id of the item the chat wants to select through stepContext.result.value or stepContext.result.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.options {@see IQueryItemIdDialogInput}. May not be undefined or null.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async whichItemInformationExists(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const input = stepContext.options as IQueryItemIdDialogInput;
        const itemThatCouldBeFound = findItemInList(input.itemsInList, input.itemToFindInList);
        if (itemThatCouldBeFound.length === 1) {
            // The list contains only one item so we assume that the user wants to select this item.
            return await stepContext.next(itemThatCouldBeFound[0].id);
        } else {
            // We do not have proficient information to find the item in the list.
            let itemChoices: Choice[];
            if (itemThatCouldBeFound.length === 0) {
                /**
                 * Based on the provided information we could not find any item.
                 * So we need to ask the chat which item from the entire list they want to select.
                 */
                itemChoices = input.itemsInList.map<Choice>(this.constructItemChoice);
            } else {
                /**
                 *  We could narrow down the potential items the user might want to select based on the given information. 
                 * Hence we only need to ask the chat which item in a subset of the initial list of items they want to select.
                */
                itemChoices = itemThatCouldBeFound.map<Choice>(this.constructItemChoice);
            }

            const messageText = `${this.question}Please pick an item from your shopping list.`;
            const retryMessageText = `I don't understand. Please tap, say the name or the position of an item in your shopping list.`;
            return await stepContext.prompt(this.getChoicePromptId(), { prompt: messageText, retryPrompt: retryMessageText }, itemChoices);
        }
    }

    /**
     * Build a {@link Choice} for one item to use with {@link ChoicePrompt}.
     * 
     * @param item that we want to construct a Choice for.
     * @returns a choice that represents the given {@link item}.
     */
    private constructItemChoice(item: Item): Choice {
        const stringRepresentation = itemAsTextMessage(item);
        return {
            value: item.id,
            action: {
                // When the chat selects this choice we want the framework to send a message to the bot with the id of the item.
                type: 'postBack',
                title: stringRepresentation,
                value: item.id,
            },
            // Synonyms are used to allow the chat to select this choice based on other information than just the id.
            synonyms: [stringRepresentation, item.itemName, item.positionInShoppingList.toString()]
        };
    }

    /**
     * Ends this dialog and returns the result of selecting one item from a list items to the parent / caller dialog {@see IQueryItemIdDialogResult}.
     * 
     * Precondition: The previous step should pass the id of the item the chat selected to this step.
     * 
     * Postcondition: Passes the id of the item that the chat wants to select to the parent dialog.
     * @param stepContext current context/state of the conversation.
     * @param stepContext.result.value should be the id of the selected item as string. Or {@link stepContext.result} needs to be provided.
     * @param stepContext.result should be the id of the selected item as string. Or {@link stepContext.result.value} needs to be provided.
     * @returns the result of this turn of the dialog. This should not bother us as developers to much since it is handled by the bot framework.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const foundItemId = (stepContext.result.value || stepContext.result) as string;

        const result: IQueryItemIdDialogResult = {
            dialogId: this.id,
            foundItemId: foundItemId
        }

        return await stepContext.endDialog(result);
    }


}