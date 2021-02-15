import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    const itemID = context.bindingData.itemID;

    if (!conversationID || !itemID || !req.body || req.body.positionInShoppingList !== undefined) {
        context.res = {
            status: 400,
            body: {
                item: req.body,
                message: 'invalid input'
            }
        };
        context.done();
        return;
    }

    try {
        const cosmosService = new CosmosDBService(conversationID);

        const updatedItem = await cosmosService.updateItem(itemID, req.body);
        context.res = {
            status: 200,
            body: {
                item: updatedItem,
                message: 'updated'
            }
        };
    } catch (error) {
        context.res = {
            status: 404,
            body: { item: req.body, message: error }
        };
    } finally {
        context.done();
    }



};

export default httpTrigger;
