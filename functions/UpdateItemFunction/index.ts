import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosDBService } from "../services/cosmosDBService";

/**
 * Updates all the properties of an existing item as defined in the body of the request. 
 * All properties not contained in the request are not changed.
 * 
 * Precondition: shoppingListID and itemID must not be null, undefined or an empty string.
 * Body of request must not be undefined or null. 
 * Body must contain updated values for properties of {@link Item}.
 * Body must not contain values for positionInShoppingList or Item id.
 * 
 * Postcondition: Updates the given properties for the specified item. Returns an error message and code if no properties could be updated.
 * 
 * @param context  passed from the Azure Functions runtime.
 * @param context.bindingData.shoppingListID uniquely identifies the shopping list which contains the {@link Item} to update.
 *         Must not be null, undefined or an empty string. Should be passed through the route parameter of the http request.
 * @param context.bindingData.itemID uniquely identifies the item that should be updated. Should be passed through the route parameter of the http request.
 * @param req is the http request for this endpoint which should contain an {@link Partial<Item>} in the body.
 * @param req.body all the properties of an {@link Item} that should be updated.
 * @returns http status code ```200``` if the item was successfully updated.
 *          Or ```400``` on invalid input.
 *          Or ```404``` if the item could not be updated.
 * 
 * [PATCH] http://localhost:7071/api/UpdateItem/{shoppingListID}/{itemID}
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const shoppingListID = context.bindingData.shoppingListID;
    const itemID = context.bindingData.itemID;

    if (!shoppingListID || shoppingListID === '' || !itemID || itemID === '' || !req.body || req.body.positionInShoppingList !== undefined || req.body.id !== undefined) {
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

        const updatedItem = await cosmosService.updateItem(itemID, req.body);
        context.res = {
            status: 200,
            body: {
                message: 'updated'
            }
        };
    } catch (error) {
        context.res = {
            status: 404,
            body: { message: error }
        };
    }
};

export default httpTrigger;
