import { Item } from "../models/item";
import { MongoClient } from "mongodb";

export class CosmosDBService {

    private readonly client: MongoClient;
    private readonly conversationID: string;
    constructor(conversationID: string) {
        this.conversationID = conversationID;
        this.client = new MongoClient(process.env.SHOPPING_LIST_COSMOSDB, { useUnifiedTopology: true });
    }

    public async addItem(item: Item) {
        try {
            const collection = await this.connectAndGetCollection();
            const positionInShoppingList: number = await collection.find({ conversationID: this.conversationID }).count() + 1;
            return await collection.insertOne({
                conversationID: this.conversationID,
                item: new Item(item.itemName, item.marked, positionInShoppingList, item.unit)
            });
        } finally {
            await this.client.close();
        }
    }

    public async removeAllItems(): Promise<void> {
        try {
            const collection = await this.connectAndGetCollection();
            await collection.deleteMany({ conversationID: this.conversationID });
        } finally {
            await this.client.close();
        }
    }

    private async connectAndGetCollection() {
        await this.client.connect();
        const database = this.client.db('shopping-list-db');
        const collection = database.collection('ItemsContainer');
        return collection;
    }

    public async removeItemByPosition(positionInShoppingList: number): Promise<void> {
        try {
            const collection = await this.connectAndGetCollection();
            const deletedItem: Item = (await collection.findOneAndDelete({ "conversationID": this.conversationID, "item.positionInShoppingList": positionInShoppingList })).value.item; // TODO change position to id
            console.dir(deletedItem);
            const positionOfDeletedItem = deletedItem.positionInShoppingList;
            await collection.updateMany({ "conversationID": this.conversationID, "item.positionInShoppingList": { $gt: positionOfDeletedItem } }, { $inc: { "item.positionInShoppingList": -1 } });
        } finally {
            await this.client.close();
        }
    }

    public async getAllItems(): Promise<Item[]> {
        try {
            const collection = await this.connectAndGetCollection();
            return (await collection.find({ conversationID: this.conversationID }).toArray()).map(nestedItem => nestedItem.item);
        } finally {
            await this.client.close();
        }
    };



    // private async removeItem(itemID: string) {
    //     const containerItem = this.container.item(itemID, this.conversationID);
    //     const removedListItem: Item = (await containerItem.read()).resource;
    //     await containerItem.delete();
    //     return removedListItem;
    // }

    // private async updateItemPositionsAfterRemoval(positionOfRemoveItem: number) {
    //     const itemsToBeUpdated = (await this.container.items.query(`SELECT * FROM c WHERE c.conversationID = '${this.conversationID}' AND c.item.positionInShoppingList > ${positionOfRemoveItem}`).fetchAll()).resources;
    //     console.dir(itemsToBeUpdated[0]);
    //     const containerItem = this.container.item(itemsToBeUpdated[0], this.conversationID);
    //     try {
    //         const i = new Item('Hello', true, 10);
    //         await containerItem.replace(i);
    //     } catch (error) {
    //         console.log(error);
    //     }
    //     console.log("containerItem.id");
    //     // containerItem.id
    //     // containerItem.replace(container);
    //     // console.dir(itemsToBeUpdated);
    //     // for (const item of itemsToBeUpdated) {
    //     //     const containerItem = this.container.item(item.id, this.conversationID);
    //     //     // console.dir(containerItem);
    //     //     item.item.positionInShoppingList = item.item.positionInShoppingList++;
    //     //     console.dir(item);
    //     //     // const updated = await containerItem.replace({ body: item.id });
    //     //     // console.dir(updated);
    //     // }
    //     // console.dir(itemsToBeUpdated);
    // }
}
