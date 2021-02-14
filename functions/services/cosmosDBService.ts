import { Item } from "../models/item";
import { FilterQuery, MongoClient, ObjectId } from 'mongodb';
import { ItemDb } from "../models/itemDb";

export class CosmosDBService {

    private readonly client: MongoClient;
    private readonly conversationID: string;
    constructor(conversationID: string) {
        if (!conversationID || conversationID === '') {
            throw new Error('Illegal value for conversationID');
        }
        this.conversationID = conversationID;

        this.client = new MongoClient(process.env.SHOPPING_LIST_COSMOSDB, { useUnifiedTopology: true });
    }

    public async addItem(item: Item) {
        if (!item || !item.itemName || item.itemName === '') {
            throw new Error('Illegal value for item');
        }
        try {
            const collection = await this.connectAndGetCollection();
            const positionInShoppingList: number = await collection.find({ conversationID: this.conversationID }).count() + 1;
            return await collection.insertOne({
                conversationID: this.conversationID,
                item: new ItemDb(item.itemName, item.marked, positionInShoppingList, item.unit)
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



    public async updateItem(itemToUpdate: Partial<Item>) {
        try {
            await this.client.connect();
            const database = this.client.db('shopping-list-db');
            const collection = database.collection('ItemsContainer');
            let filter: FilterQuery<any>;
            if (itemToUpdate.positionInShoppingList && itemToUpdate.itemName === undefined) {
                filter = { 'item.positionInShoppingList': itemToUpdate.positionInShoppingList, 'conversationID': this.conversationID };
            } else if (itemToUpdate !== undefined) {
                filter = { 'item.itemName': itemToUpdate.itemName, 'conversationID': this.conversationID };

            } else {
                throw new Error('Need itemNam or positionInShoppingList to update item');
            }
            collection.updateOne(filter, {
                conversationID: this.conversationID,
                item: itemToUpdate
            });
        } catch (err) {
            console.dir(err);
        } finally {
            // Ensures that the client will close when you finish/error
            await this.client.close();
        }
    }

    public async removeItemByID(id: string): Promise<void> {
        if (!id || id === '') {
            throw new Error('Illegal value for id');
        }
        try {
            const collection = await this.connectAndGetCollection();
            const deletedItem: Item = (await collection.findOneAndDelete({ 'conversationID': this.conversationID, '_id': new ObjectId(id) })).value.item;
            const positionOfDeletedItem = deletedItem.positionInShoppingList;
            await collection.updateMany({ 'conversationID': this.conversationID, 'item.positionInShoppingList': { $gt: positionOfDeletedItem } }, { $inc: { 'item.positionInShoppingList': -1 } });
        } finally {
            await this.client.close();
        }
    }

    public async getAllItems(): Promise<Item[]> {
        try {
            const collection = await this.connectAndGetCollection();
            const findResult = await collection.find({ conversationID: this.conversationID }).toArray();
            return findResult.map(dbDocument => {
                const item: Item = dbDocument.item;
                item.id = dbDocument._id;
                return item;
            });
        } finally {
            await this.client.close();
        }
    };

    private async connectAndGetCollection() {
        await this.client.connect();
        const database = this.client.db('shopping-list-db');
        const collection = database.collection('ItemsContainer');
        return collection;
    }
}
