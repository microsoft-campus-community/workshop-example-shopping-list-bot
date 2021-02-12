import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Item } from "../models/item";
import { CosmosDBService } from "../services/cosmosDBService";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const conversationID = context.bindingData.conversationID;
    if (!conversationID || !req.body || (!req.body.itemName && !req.body.positionInShoppingList)) {
        context.res = {
            status: 400,
            body: {
                item: req.body,
                message: 'invalid input'
            }
        };
        context.done();
    }
    const body = req.body;
    let itemToUpdate: Partial<Item>;
    if(body.positionInShoppingList && body.marked){
        itemToUpdate = {
            positionInShoppingList: body.positionInShoppingList,
            marked: body.marked
        }
    }
    console.dir(itemToUpdate);
    try {
        const cosmosService = new CosmosDBService(conversationID);
       
        const updatedItem = await cosmosService.updateItem(itemToUpdate);
        context.res = {
            status: 200,
            body: {
                item: updatedItem
            }
        };
    } catch (error) {
        context.res = {
            status: 404,
            body:  { item: itemToUpdate, message: error }
        };
    } finally {
        context.done();
    }



};

export default httpTrigger;