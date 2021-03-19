import { Item } from "../models/item";

/**
 * To interact with the shopping list API build with Azure Functions.
 */
export class FunctionService {
    private baseUrl: string;

    /**
     * 
     * @param baseUrl of where to react the Azure Funtion (i.e. 'http://<APP_NAME>.azurewebsites.net/api' or 'http://localhost:<PORT>/api')
     */
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Adds an item to the shopping list belonging to a certain chat.
     * @param conversationId the {@link item} should be added to.
     * @param item to add to the shopping list of the {@link conversationId}.
     * @returns Promise for when the http call returns a response.
     */
    public addItem(conversationId: string, item: Item): Promise<Response> {
        return fetch(`${this.baseUrl}/AddItemFunction/${conversationId}`,
            {
                method: "post",
                body: JSON.stringify(item)
            });

    }

    /**
     * Returns all items in a certain shopping list.
     * @param conversationId of which all items should be retrieved.
     * @returns Promise for when the http call returns a response.
     */
    public getItemsInShoppingList(conversationId: string): Promise<Response> {
        return fetch(`${this.baseUrl}/GetItemsFunction/${conversationId}`);
    }

    /**
     * Removes a single item from the shopping list.
     * @param conversationId that defines which shopping lsit to remove the item from.
     * @param itemID of the item that should be removed.
     * @returns Promise for when the http call returns a response.
     */
    public removeItemByID(conversationId: string, itemID: string): Promise<Response> {
        console.dir(itemID);
        return fetch(`${this.baseUrl}/RemoveItemByIDFunction/${conversationId}/${itemID}`,
            {
                method: 'delete'
            });
    }

    /**
     * Removes all items from a given shopping list.
     * @param conversationID to identify the shopping list of which all items should be removed.
     * @returns Promise for when the http call returns a response.
     */
    public removeAllItems(conversationID: string) {
        return fetch(`${this.baseUrl}/RemoveAllItemsFunction/${conversationID}`,
            {
                method: 'delete'
            });
    }

    /**
     * Updates an item in a shopping list.
     * @param conversationId to identify which shopping list to update the item in.
     * @param itemToPatch containing all the information that should be changed in the item.
     * @returns Promise for when the http call returns a response.
     */
    public patchItemInShoppingList(conversationId: string, itemToPatch: Partial<Item>): Promise<Response> {
        if (itemToPatch.id) {
            if (itemToPatch.itemName || itemToPatch.marked || itemToPatch.positionInShoppingList || itemToPatch.unit) {
                return fetch(`${this.baseUrl}/UpdateItem/${conversationId}/${itemToPatch.id}`,
                    {
                        method: "patch",
                        body: JSON.stringify(itemToPatch)
                    });
            }
        }
    }
}
