import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosDBService } from "../services/cosmosDBService";

/**
 * Removes/deletes all items from a given shopping list.
 * 
 * Precondition: shoppingListID must not be null, undefined or an empty string.
 * 
 * Postcondition: On success all items from teh shopping list are removed and can not be reverted.
 *                  On failure no items are removed from the shopping list and an error code and message are returned.
 * @param context passed from the Azure Functions runtime.
 * @param context.bindingData.shoppingListID determines the shopping list from which all items are removed.
 *         Must not be null, undefined or an empty string. Should be passed through the route parameter of the http request. 
 * @returns status ```200``` if all items could be removed from the shopping list belonging to the given shoppingListID.
 *      Or http status ```404``` if the shopping list could not be found.
 *      Or http status ```400``` on invalid input.
 * 
 * [DELETE] http://<FUNCTION_URL>1/api/RemoveAllItemsFunction/{shoppingListID}
 */
const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
    const shoppingListID = context.bindingData.shoppingListID;
    if (!shoppingListID || shoppingListID === '') {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input'
            }
        };
        return;
    }

    try {
        const cosmosService = new CosmosDBService(shoppingListID);
        await cosmosService.removeAllItems();
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
