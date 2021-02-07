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
}
