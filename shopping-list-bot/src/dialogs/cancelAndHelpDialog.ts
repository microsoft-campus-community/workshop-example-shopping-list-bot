// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InputHints } from 'botbuilder';
import { ComponentDialog, DialogContext, DialogTurnResult, DialogTurnStatus } from 'botbuilder-dialogs';

/**
 * This base class watches for common phrases like "help" and "cancel" and takes action on them
 * BEFORE they reach the normal bot logic.
 */
export class CancelAndHelpDialog extends ComponentDialog {
    constructor(id: string) {
        super(id);
    }

    /**
     * Callback when a user sends an activity in a bot in the context of an ongoing conversation.
     * 
     * Postcondition: Calls the onContinueDialog of its parent class if the user does not want to get help, cancel or quit with this message. If the activity is interpreted as a help, cancel or quit message than the parent class will not be called.
     * @param innerDc 
     */
    public async onContinueDialog(innerDc: DialogContext): Promise<DialogTurnResult> {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }
        return await super.onContinueDialog(innerDc);
    }

    /**
     * Process the activity the user send to see if they need help, want to cancel or quit the dialog.
     * Acts on the before mentioned commands appropriately.
     * @param innerDc context of the dialog.
     */
    private async interrupt(innerDc: DialogContext): Promise<DialogTurnResult | undefined> {
        if (innerDc.context.activity.text) {
            const text = innerDc.context.activity.text.toLowerCase();
            switch (text) {
                case 'help':
                case '?':
                    const helpMessageText = 'Show help here';
                    await innerDc.context.sendActivity(helpMessageText, helpMessageText, InputHints.ExpectingInput);
                    return { status: DialogTurnStatus.waiting };
                case 'cancel':
                case 'quit':
                    const cancelMessageText = 'Cancelling...';
                    await innerDc.context.sendActivity(cancelMessageText, cancelMessageText, InputHints.IgnoringInput);
                    return await innerDc.cancelAllDialogs();
            }
        }
    }
}
