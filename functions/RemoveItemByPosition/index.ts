import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosDBService } from "../services/cosmosDBService";

/**
 * Removes/deletes an certain item from a specific shopping list.
 * 
 * Precondition: conversationID and itemID must not be null, undefined or empty string.
 * 
 * Postcondition: the item with given id is removed and the positions of the items with greater position are decreased by one. An error code and message are returned if the item could not be removed.
 * 
 * @param context passed from the Azure Functions runtime.
 * @param context.bindingData.conversationID uniquely identifies the shopping list from which an {@link Item} should be removed.
 *         Must not be null, undefined or an empty string. Should be passed through the route parameter of the http request.
 * @param context.bindingData.itemID uniquely identifies the item that should be removed.
 * @returns status ```200``` if the item could be removed from the shopping list belonging to the given conversationID.
 *      Or http status ```404``` if the shopping list could not be found.
 *      Or http status ```400``` on invalid input.
 * 
 * [DELETE] http://<FUNCTION_URL>/api/RemoveItemByIDFunction/{conversationID}/{itemID}
 */
const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    const itemID = context.bindingData.itemID;
    if (!conversationID || conversationID === '' || !itemID || itemID === '') {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input'
            }
        };
        return;
    }

    try {
        const cosmosService = new CosmosDBService(conversationID);
        await cosmosService.removeItemByID(itemID);
        context.res = {
            status: 200,
            body: { message: 'Deleted' }
        };
    } catch (error) {
        context.res = {
            status: 404,
            body: { message: 'Not found' }
        };
    }
};

export default httpTrigger;
