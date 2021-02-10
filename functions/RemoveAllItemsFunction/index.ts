import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    if (!conversationID) {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input'
            }
        };
        context.done();
    }

    try {
        const cosmosService = new CosmosDBService(conversationID);
        const removedItems: Item[] = await cosmosService.removeAllItems();
        context.res = {
            status: 200,
            body: removedItems
        };
    } catch (error) {
        context.res = {
            status: 404,
            body: { message: 'Not found' }
        };
    } finally {
        context.done();
    }

};

export default httpTrigger;
