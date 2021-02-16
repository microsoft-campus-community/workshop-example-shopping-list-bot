import { Item } from "../models/item";

export class FunctionService {
    private baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public addItem(conversationId: string, item: Item): Promise<Response> {
        return fetch(`${this.baseUrl}/AddItemFunction/${conversationId}`,
            {
                method: "post",
                body: JSON.stringify(item)
            });

    }

    public getItemsInShoppingList(conversationId: string): Promise<Response> {
        return fetch(`${this.baseUrl}/GetItemsFunction/${conversationId}`);
    }

    public removeItemByID(conversationId: string, itemID: string): Promise<Response> {
        console.dir(itemID);
        return fetch(`${this.baseUrl}/RemoveItemByIDFunction/${conversationId}/${itemID}`,
            {
                method: 'delete'
            });
    }

    public removeAllItems(conversationID: string) {
        return fetch(`${this.baseUrl}/RemoveAllItemsFunction/${conversationID}`,
            {
                method: 'delete'
            });
    }

    public patchItemInShoppingList(conversationId: string, itemToPatch: Partial<Item>) : Promise<Response> {
        if(itemToPatch.id) {
            if(itemToPatch.itemName || itemToPatch.marked || itemToPatch.positionInShoppingList || itemToPatch.unit) {
                return fetch(`${this.baseUrl}/UpdateItem/${conversationId}/${itemToPatch.id}`,
                {
                    method: "patch",
                    body: JSON.stringify(itemToPatch)
                });
            }
        }
    }
}
