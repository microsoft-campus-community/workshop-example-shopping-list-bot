import { Container, CosmosClient } from "@azure/cosmos";
import { Item } from "../models/item";

export class CosmosDBService {

    private readonly conversationID: string;
    private readonly container: Container;
    constructor(conversationID: string) {
        this.conversationID = conversationID;
        const client = new CosmosClient(process.env.SHOPPING_LIST_COSMOSDB);
        this.container = client.database('shopping-list-db').container('ShoppingListContainer');

    }

    public async removeItemByPosition(positionInShoppingList: number): Promise<Item> {
        const itemID: string = (await this.container.items.query(`SELECT c.id FROM c WHERE c.conversationID = '${this.conversationID}' AND c.item.positionInShoppingList = ${positionInShoppingList}`).fetchNext()).resources[0]?.id;
        console.log(itemID);
        if (itemID) {
            const removedListItem: Item = await this.removeItem(itemID);
            await this.updateItemPositionsAfterRemoval(positionInShoppingList);
            return removedListItem;
        } else {
            throw new Error('Item could not be removed');
        }
    }


    public async removeAllItems() {
        const itemIDs = (await this.container.items.query(`SELECT c.id FROM c WHERE c.conversationID = '${this.conversationID}'`).fetchAll()).resources;
        const removedItems: Item[] = [];
        if (itemIDs && itemIDs.length > 0) {
            for (const id of itemIDs) {
                removedItems.push(await this.removeItem(id.id));
            }
            return removedItems;
        } else {
            throw new Error('There are no items for this conversation id');
        }
    }

    private async removeItem(itemID: string) {
        const containerItem = this.container.item(itemID, this.conversationID);
        const removedListItem: Item = (await containerItem.read()).resource;
        await containerItem.delete();
        return removedListItem;
    }

    private async updateItemPositionsAfterRemoval(positionOfRemoveItem: number) {
        const itemsToBeUpdated = (await this.container.items.query(`SELECT * FROM c WHERE c.conversationID = '${this.conversationID}' AND c.item.positionInShoppingList > ${positionOfRemoveItem}`).fetchAll()).resources;
        console.dir(itemsToBeUpdated[0]);
        const containerItem = this.container.item(itemsToBeUpdated[0], this.conversationID);
        try {
            const i = new Item('Hello', true, 10);
            await containerItem.replace(i);
        } catch (error) {
            console.log(error);
        }
        console.log("containerItem.id");
        // containerItem.id
        // containerItem.replace(container);
        // console.dir(itemsToBeUpdated);
        // for (const item of itemsToBeUpdated) {
        //     const containerItem = this.container.item(item.id, this.conversationID);
        //     // console.dir(containerItem);
        //     item.item.positionInShoppingList = item.item.positionInShoppingList++;
        //     console.dir(item);
        //     // const updated = await containerItem.replace({ body: item.id });
        //     // console.dir(updated);
        // }
        // console.dir(itemsToBeUpdated);
    }
}
