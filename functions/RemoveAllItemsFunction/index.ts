import { AzureFunction, Context, HttpRequest } from "@azure/functions";
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
        return;
    }

    try {
        const cosmosService = new CosmosDBService(conversationID);
        await cosmosService.removeAllItems();
        context.res = {
            status: 200,
            body: { message: 'Deleted' }
        };
    } catch (error) {
        // TODO logger for error
        context.res = {
            status: 404,
            body: { message: 'Not found' }
        };
    }
};

export default httpTrigger;
