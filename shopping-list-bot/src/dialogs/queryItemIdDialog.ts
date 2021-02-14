import { InputHints, MessageFactory } from "botbuilder";
import {Choice, ChoiceFactory, ChoiceFactoryOptions, ChoicePrompt, ConfirmPrompt, DialogTurnResult, TextPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { IDialogResult } from "../models/dialogResult";
import { Item } from "../models/item";
import { CancelAndHelpDialog } from "./cancelAndHelpDialog";


const TEXT_PROMPT = 'queryItemIdTextPrompt';
const WATERFALL_DIALOG = 'queryItemIdWaterfallDialog';
const CHOICE_DIALOG = 'queryItemIdChoiceDialog';

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
        const itemThatCouldBeFound = this.findItemInList(input.itemsInList, input.itemToFindInList);
        console.log("items that could be found:");
        console.dir(itemThatCouldBeFound);
        if(itemThatCouldBeFound.length === 1){
            return await stepContext.next(itemThatCouldBeFound[0].id);
        } else {
            // We do not have proficient information to find the item in the list
            let itemChoices;
            if(itemThatCouldBeFound.length === 0) {
                itemChoices = input.itemsInList.map<Choice>(this.constructItemChoice);
            } else {
                itemChoices = input.itemsInList.map<Choice>(this.constructItemChoice);
            }
            console.log("itemChoice:");
            console.dir(itemChoices);
            const messageText = `${this.question} Please pick an item from your shopping list.`;
            const message = ChoiceFactory.forChannel(stepContext.context, itemChoices, messageText, messageText );
            return await stepContext.prompt(this.getChoicePromptId(), {prompt: message});
        }
    }

    private constructItemChoice(item: Item): Choice {
       const stringRepresentation = item.toString();
       console.log("string representation: " + stringRepresentation);
        return {
            value: item.id,
            action: {
                type: 'imBack',
                title: stringRepresentation,
                value: item.id,
            },
            synonyms: [stringRepresentation, item.itemName, item.positionInShoppingList.toString()]
        };
    }
/*
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
*/

    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const foundItemId = stepContext.result as string;


        const result: IQueryItemIdDialogResult = {
            dialogId: this.id,
            foundItemId: foundItemId
        }
        return await stepContext.endDialog(result);
       /* const inputItem = stepContext.result as string;
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
*/
    }

    private findItemInList(items: Item[], itemToFind: Partial<Item>): Item[] {
        if(itemToFind.id) {
            return items.filter(item => item.id === itemToFind.id);
        } else if(itemToFind.positionInShoppingList) {
            return items.filter(item => item.positionInShoppingList === itemToFind.positionInShoppingList);
        } else if(itemToFind.itemName) {
           return  items.filter(item => item.itemName === itemToFind.itemName);
        } else {
            return [];
        }
    }
}