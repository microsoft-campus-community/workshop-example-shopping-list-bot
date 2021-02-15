// Licensed under the MIT License.

import { config } from 'dotenv';
import * as path from 'path';

// Note: Ensure you have a .env file and include LuisAppId, LuisAPIKey and LuisAPIHostName.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

import * as restify from 'restify';

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { AutoSaveStateMiddleware, BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } from 'botbuilder';
import { LuisApplication } from 'botbuilder-ai';

// The bot and its main dialog.
import {  StartAndWelcomeBot } from './bots/startAndWelcomeBot';
import { MainDialog } from './dialogs/mainDialog';

// The bot's booking dialog
import { AddItemDialog } from './dialogs/addItemDialog';
const ADD_ITEM_DIALOG = 'addItemDialog';
const GET_ALL_ITEMS_DIALOG = 'getAllItemsDialog';
const MARK_ITEM_DIALOG = 'markItemDialog';
const UNMARK_ITEM_DIALOG = 'unmarkItemDialog';
const REMOVE_ALL_ITEMS_DIALOG = 'removeAllItemsDialog';
const REMOVE_ITEM_DIALOG = 'removeItemDialog';


// The helper-class recognizer that calls LUIS
import { ShoppingListRecognizer } from './dialogs/addItemRecognizer';
import { GetAllItemsDialog } from './dialogs/getAllItemsDialog';
import { QueryItemIdDialog } from './dialogs/queryItemIdDialog';
import { RemoveAllItemsDialog } from './dialogs/removeAllItemsDialog';
import { FunctionService } from './services/functionsService';
import { UpdateMultipleItemsDialog } from './dialogs/updateMultipleItemsDialog';
import { ShoppingListAdaptiveCardResponseMiddleware } from './middleware/ShoppingListAdaptiveCardResponseMiddleware';

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});


// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${error}`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
    // Clear out state
    await conversationState.delete(context);
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
let conversationState: ConversationState;
let userState: UserState;

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
conversationState = new ConversationState(memoryStorage);
userState = new UserState(memoryStorage);

// If configured, pass in the FlightBookingRecognizer. (Defining it externally allows it to be mocked for tests)
const { LuisAppId, LuisAPIKey, LuisAPIHostName } = process.env;
const luisConfig: LuisApplication = { applicationId: LuisAppId, endpointKey: LuisAPIKey, endpoint: `https://${LuisAPIHostName}` };

const luisRecognizer = new ShoppingListRecognizer(luisConfig);


const functionService = new FunctionService(process.env.FunctionsBaseURL);

// Create the main dialog.
const addItemDialog = new AddItemDialog(ADD_ITEM_DIALOG);
const getAllItemsDialog = new GetAllItemsDialog(GET_ALL_ITEMS_DIALOG);
const markItemDialog = new QueryItemIdDialog(MARK_ITEM_DIALOG, 'Which item do you want to mark?');
const unmarkItemDialog = new QueryItemIdDialog(UNMARK_ITEM_DIALOG, 'Which item do you want to mark as not done?');
const removeItemDialog = new QueryItemIdDialog(REMOVE_ITEM_DIALOG, 'Which item do you want to remove?');
const removeAllItemsDialog = new RemoveAllItemsDialog(REMOVE_ALL_ITEMS_DIALOG);

const dialog = new MainDialog(luisRecognizer, addItemDialog, getAllItemsDialog, markItemDialog, unmarkItemDialog, removeItemDialog, removeAllItemsDialog, functionService);
const bot = new StartAndWelcomeBot(conversationState, userState, dialog);

adapter.use(new AutoSaveStateMiddleware(conversationState, userState));
adapter.use(new ShoppingListAdaptiveCardResponseMiddleware(functionService));

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming activities and route them to your bot main dialog.
server.post('/api/messages', (req, res) => {
    // Route received a request to adapter for processing
    adapter.processActivity(req, res, async (turnContext) => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});

// Listen for Upgrade requests for Streaming.
server.on('upgrade', (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new BotFrameworkAdapter({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword
    });
    // Set onTurnError for the BotFrameworkAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    streamingAdapter.useWebSocket(req, socket, head, async (context) => {
        // After connecting via WebSocket, run this logic for every request sent over
        // the WebSocket connection.
        await bot.run(context);
    });
});
