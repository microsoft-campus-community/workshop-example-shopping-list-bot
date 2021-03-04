import { BotState, CardFactory } from 'botbuilder';
import { Dialog, DialogState } from 'botbuilder-dialogs';
import { MainDialog } from '../dialogs/mainDialog';
import { DialogBot } from './dialogBot';

/**
 * Activity handler to send a welcome message when new person is added to the chat.
 */
export class StartAndWelcomeBot extends DialogBot {
     /**
     *
     * @param {BotState} conversationState the bot can access information about the current turn within the dialog to pick up where the last message left off.
     * @param {BotState} userState the bot can access information it wants to store about the user through.
     * @param {Dialog} dialog that should be run when a new user is added.
     */
    constructor(conversationState: BotState, userState: BotState, dialog: Dialog) {
        super(conversationState, userState, dialog);
        // register handler to be notified by the bot framework when a new person is added to the chat with this bot.
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    // send welcome message and
                    const welcomeMessageText = `Hi ${member.name}, I am looking forward managing your shopping list.`;
                    await context.sendActivity(welcomeMessageText, welcomeMessageText);
                    // run the provided dialog
                    await (dialog as MainDialog).run(context, conversationState.createProperty<DialogState>('DialogState'));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
