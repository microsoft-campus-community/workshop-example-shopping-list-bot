import { AzureFunction, Context, HttpRequest, ContextBindings } from "@azure/functions";
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

/**
 * Get all items of a given shopping list.
 * 
 * Precondition: conversationID must not be null, undefined or an empty string.
 * Postcondition: all items in the {@link conversationID}'s shopping list are retrieved. An error message and error code is returned on failure.
 * 
 * @param context passed from the Azure Functions runtime.
 * @param context.bindingData.conversationID defines to get the items from the shopping list that belongs to this ID.
 *         Must not be null, undefined or an empty string. Should be passed through the route parameter of the http request.
 * @returns http status 200 with body containing an array of all items in the shopping list belonging to the conversationID on success.
 *      Or Status 400 and an error message in the ```message``` attribute of the body.
 * 
 * [GET] http://<FUNCTION_URL>/api/GetItemsFunction/{conversationID}
 */
const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
    if (!context.bindingData.conversationID || context.bindingData.conversationID === '') {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input: conversation id required'
            }
        };
        return;
    }

    try {
        const cosmosService = new CosmosDBService(context.bindingData.conversationID);
        const items: Item[] = await cosmosService.getAllItems();
        context.res = {
            status: 200,
            body: items
        };
    } catch (error) {
        context.res = {
            status: 400,
            body: { message: 'Error in retrieving items' }
        };
    }
};

export default httpTrigger;
