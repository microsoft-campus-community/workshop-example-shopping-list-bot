import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    if (!conversationID || !req.body || !req.body.itemName) {
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
