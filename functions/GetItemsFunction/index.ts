import { AzureFunction, Context, HttpRequest, ContextBindings } from "@azure/functions";
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (!context.bindingData.conversationID) {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input: conversation id required'
            }
        };
        context.done();
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
    context.done();

};

export default httpTrigger;
