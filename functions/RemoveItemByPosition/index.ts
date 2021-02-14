import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    const itemID = context.bindingData.itemID;
    if (!conversationID || !itemID || itemID === '') {
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
    } finally {
        context.done();
    }
};

export default httpTrigger;