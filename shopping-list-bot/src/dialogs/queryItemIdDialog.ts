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
    itemToFindInList: Partial<Item>,
    itemsInList: Item[]
}

export interface IQueryItemIdDialogResult extends IDialogResult {
    foundItemId: string
}


export class QueryItemIdDialog extends CancelAndHelpDialog {
    private question = '';

    constructor(id: string, question: string) {
        super(id || 'queryItemIdDialog');
        this.addDialog(new TextPrompt(this.getTextPromptId()))
        .addDialog(new ChoicePrompt(this.getChoicePromptId()))
            .addDialog(new WaterfallDialog(this.getWaterfallDialogId(), [
                this.whichItemInformationExists.bind(this),
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

    private getChoicePromptId(): string {
        return this.id + CHOICE_DIALOG;
    }


    private async whichItemInformationExists(stepContext: WaterfallStepContext): Promise<DialogTurnResult>{
        const input = stepContext.options as IQueryItemIdDialogInput;
        const itemThatCouldBeFound = findItemInList(input.itemsInList, input.itemToFindInList);
        console.log("items that could be found:");
        console.dir(itemThatCouldBeFound);
        if(itemThatCouldBeFound.length === 1){
            return await stepContext.next(itemThatCouldBeFound[0].id);
        } else {
            // We do not have proficient information to find the item in the list
            let itemChoices: Choice[];
            if(itemThatCouldBeFound.length === 0) {
                itemChoices = input.itemsInList.map<Choice>(this.constructItemChoice);
            } else {
                itemChoices = input.itemsInList.map<Choice>(this.constructItemChoice);
            }
            console.log("itemChoice:");
            console.dir(itemChoices);
            const messageText = `${this.question} Please pick an item from your shopping list.`;
            const retryMessageText = `I don't understand. Please tap, say the name or the position of an item in your shopping list.`;
            return await stepContext.prompt(this.getChoicePromptId(), {prompt: messageText, retryPrompt: retryMessageText},itemChoices);
        }
    }

    private constructItemChoice(item: Item): Choice {
       const stringRepresentation = itemAsTextMessage(item);
       console.log("string representation: " + stringRepresentation);
        return {
            value: item.id,
            action: {
                type: 'postBack',
                title: stringRepresentation,
                value: item.id,
            },
            synonyms: [stringRepresentation, item.itemName, item.positionInShoppingList.toString()]
        };
    }

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const foundItemId = (stepContext.result.value || stepContext.result) as string;
        

        const result: IQueryItemIdDialogResult = {
            dialogId: this.id,
            foundItemId: foundItemId
        }
        return await stepContext.endDialog(result);
    }

   
}