import { Item } from "../models/item";

export class FunctionService {
    private baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public addItem(conversationId: string, item: Item): Promise<Response> {
        console.log("additem");
        console.dir(item);
        return fetch(`${this.baseUrl}/AddItemFunction/${conversationId}`,
            {
                method: "post",
                body: JSON.stringify(item)
            });

    }

    public getItemsInShoppingList(conversationId: string): Promise<Response> {
        return fetch(`${this.baseUrl}/GetItemsFunction/${conversationId}`);
    }

    public removeItemByPosition(conversationId: string, position: number): Promise<Response> {
        return fetch(`${this.baseUrl}/RemoveItemByPositionFunction/${conversationId}/${position}`,
            {
                method: 'delete',
            });
    }
}
