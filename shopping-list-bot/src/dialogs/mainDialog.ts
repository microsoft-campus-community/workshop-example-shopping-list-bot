// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { Item } from '../models/item';
import { Unit } from '../models/unit';

import { InputHints, MessageFactory, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';

import {
    ComponentDialog,
    DialogSet,
    DialogState,
    DialogTurnResult,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { AddItemDialog } from './addItemDialog';
import { AddItemRecognizer } from './addItemRecognizer';

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

export class MainDialog extends ComponentDialog {
    private luisRecognizer: AddItemRecognizer;

    constructor(luisRecognizer: AddItemRecognizer, addItemDialog: AddItemDialog) {
        super('MainDialog');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        if (!addItemDialog) throw new Error('[MainDialog]: Missing parameter \'addItemDialog\' is required');

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(addItemDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {TurnContext} context
     */
    public async run(context: TurnContext, accessor: StatePropertyAccessor<DialogState>) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    private async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (!this.luisRecognizer.isConfigured) {
            const luisConfigMsg = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(luisConfigMsg, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        const messageText = (stepContext.options as any).restartMsg ? (stepContext.options as any).restartMsg : 'What can I help you with today?\nSay something like "Add 200 gramm bananas"';
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt('TextPrompt', { prompt: promptMessage });
    }

    /**
     * Second step in the waterall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    private async actStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const item = new Item();

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the BookingDialog path.
            return await stepContext.beginDialog('addItemDialog', item);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        switch (LuisRecognizer.topIntent(luisResult)) {
            case 'AddItem':
                const itemName = this.luisRecognizer.getItemNameEntities(luisResult);
                const unit = this.luisRecognizer.getUnitEntities(luisResult);
                item.itemName = itemName;
                item.unit = unit;

                return await stepContext.beginDialog('addItemDialog', item);
            default:
                // Catch all for unhandled intents
                const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${LuisRecognizer.topIntent(luisResult)})`;
                await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }

        return await stepContext.next();
    }

    /**
     * This is the final step in the main waterfall dialog.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        // If the child dialog ("addItemDialog") was cancelled or the user failed to confirm, the result here will be null.
        if (stepContext.result) {
            const result = stepContext.result as Item;
            // TODO This is where calls to the Azure Functions or Shopping ListGraph API would go

            // If the call to Azure function or Shopping List Graph API is successfull, tell the user.
            let message: string;
            if (result.unit) {
                message = `I have added ${result.unit.value} ${result.unit.unitName} ${result.itemName} to your shopping list.`;
            } else {
                message = `I have added ${result.itemName} to your shopping list.`;
            }
            await stepContext.context.sendActivity(message);
        }

        // Restart the main dialog waterfall with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }
}
