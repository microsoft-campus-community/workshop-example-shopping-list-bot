import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

/**
 * Http endpoint to add an {@link Item} passed in the request to the shopping list belonging to a certain conversationID.
 * 
 * Precondition: Item and item's name must not be undefined and item's name must not be an empty string. ConversationID must not be undefined or an empty string.
 * Postcondition: The given item is added to the shopping list with last position in shopping list and the added item is returned. An error message is returned if adding the item failed.
 * 
 * @param context passed from the Azure Functions runtime.
 * @param req is the http request for this endpoint which should contain an {@link Item} in the body.
 * @param req.body the {@link Item} to be added to the shopping list.
 * @param req.body.itemName name for the item to add. Must not be undefined or an empty string.
 * @param context.bindingData.conversationID item is added to the shopping list belonging to this conversation ID.
 *         Must not be null, undefined or an empty string. Should be passed through the route parameter of the http request.
 * @returns the added item in the response body and status 201. Or status 400 and an error mesage in body.message.
 * 
 * [POST] http://<FUNCTION_URL>/api/AddItemFunction/{conversationID}
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    if (!conversationID || conversationID === '' || !req.body || !req.body.itemName) {
        console.dir("[DEBUG] ITEM: " + req.body);
        console.dir("[DEBUG] ID: " + conversationID);
        context.res = {
            status: 400,
            body: {
                message: 'invalid input'
            }
        };
        return;
    }

    try {
        const cosmosService: CosmosDBService = new CosmosDBService(conversationID);
        const itemAdded: Item = await cosmosService.addItem(req.body);
        context.res = {
            status: 201,
            body: itemAdded
        };
    } catch (error) {
        context.res = {
            status: 400,
            body: {
                message: error.message
            }
        };
    }
};

export default httpTrigger;
