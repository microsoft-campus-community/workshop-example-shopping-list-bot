import { AzureFunction, Context, ContextBindings, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { Item } from "../models/item";
import { config } from 'dotenv';
import * as path from 'path';

// Note: Ensure you have a .env file and include LuisAppId, LuisAPIKey and LuisAPIHostName.
const ENV_FILE = path.join(__dirname, '..', '..', '.env');
config({ path: ENV_FILE });

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest, removeShoppingListDocument: ContextBindings): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    const positionInShoppingList = context.bindingData.positionInShoppingList;
    if (!conversationID || !positionInShoppingList || positionInShoppingList <= 0) {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input'
            }
        };
        context.done();
    }

    const client = new CosmosClient({ endpoint: process.env.CosmosEndpoint, key: process.env.CosmosKey });
    const container = client.database('shopping-list-db').container('ShoppingListContainer');
    const itemID: string = (await container.items.query(`SELECT c.id FROM c WHERE c.conversationID = '${conversationID}' AND c.item.positionInShoppingList = ${positionInShoppingList}`).fetchNext()).resources[0]?.id;
    if (itemID) {
        const containerItem = container.item(itemID, conversationID);
        const shoppingListItem: Item = (await containerItem.read()).resource;
        await containerItem.delete();
        context.res = {
            status: 200, /* Defaults to 200 */
            body: shoppingListItem
        };
        context.done();
    } else {
        context.res = {
            status: 404, /* Defaults to 200 */
            body: { message: 'Not found' }
        };
        context.done();
    }


};

export default httpTrigger;
