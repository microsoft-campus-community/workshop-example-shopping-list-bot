import { AzureFunction, Context, ContextBindings, HttpRequest } from "@azure/functions";
import { Item } from "../models/item";
import { Unit } from "../models/unit";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest, getShoppingListDocument: ContextBindings): Promise<void> {
    if (!context.bindingData.conversationID || !req.body.item || !req.body.item.itemName) {
        context.res = {
            status: 400
        };
        context.done();
    }

    const positionInShoppingList = getShoppingListDocument[0].$1 + 1;
    const item: Item = new Item(req.body.item.itemName, false, positionInShoppingList, new Unit(req.body.item.unit.unitName, req.body.item.unit.value));

    context.bindings.addShoppingListDocument = JSON.stringify({
        conversationID: context.bindingData.conversationID,
        item: item
    });
    context.res = {
        status: 201,
    };
    context.done();
};

export default httpTrigger;

/**
 * Table: SHOPPING_LIST
 * CONVERSATION_ID | UNIT       | ITEM_NAME
 * --------------------------------------------
 * abcd            | 3 kilogram | bananas
 * def             | 5          | apples
 * abcd            | 2 liters   | orange juice
 * abcd            | 1 kilogram | potatoes
 * abcd            | 200 gramm  | flour
 * abcd            | 400 gramm  | pork tenderloin
 *
 *
 * SELECT UNIT, ITEM_NAME FROM SHOPPING_LIST WHERE CONVERSATION_ID = 'abcd';
 * --> [...]
 *
 */
