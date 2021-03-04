import { ActivityHandler, BotState, ConversationState, StatePropertyAccessor, UserState } from 'botbuilder';
import { Dialog, DialogState } from 'botbuilder-dialogs';
import { MainDialog } from '../dialogs/mainDialog';

/**
 * Processes the incoming activity and starts a given dialog of the shopping list bot when a message is received.
 */
export class DialogBot extends ActivityHandler {
    private conversationState: BotState;
    private userState: BotState;
    private dialog: Dialog;
    protected dialogState: StatePropertyAccessor<DialogState>;

    /**
     *
     * @param {BotState} conversationState the bot can access information about the current turn within the dialog to pick up where the last message left off.
     * @param {BotState} userState the bot can access information it wants to store about the user through.
     * @param {Dialog} dialog that should be run when receiving a message.
     */
    constructor(conversationState: BotState, userState: BotState, dialog: Dialog) {
        super();
        if (!conversationState) {
            throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        }
        if (!userState) {
            throw new Error('[DialogBot]: Missing parameter. userState is required');
        }
        if (!dialog) {
            throw new Error('[DialogBot]: Missing parameter. dialog is required');
        }

        this.conversationState = conversationState as ConversationState;
        this.userState = userState as UserState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty<DialogState>('DialogState');

        // Register listener for when the bot receives a message
        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');
            // Run the main Dialog with the new message Activity.
            await (this.dialog as MainDialog).run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
