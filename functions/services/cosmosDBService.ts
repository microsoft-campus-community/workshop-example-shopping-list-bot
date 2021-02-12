import { Container, CosmosClient } from "@azure/cosmos";
import { Item } from "../models/item";
import {FilterQuery, MongoClient} from 'mongodb';

export class CosmosDBService {

    private readonly conversationID: string;
    private readonly client: MongoClient;
    constructor(conversationID: string) {
        this.conversationID = conversationID;
        this.client = new MongoClient(process.env.SHOPPING_LIST_COSMOSDB);
    }



    public async updateItem(itemToUpdate: Partial<Item>) {
        try {
        await this.client.connect();
        const database = this.client.db('shopping-list-db');
        const collection = database.collection('ItemsContainer');
        let filter: FilterQuery<any>;
        if(itemToUpdate.positionInShoppingList && itemToUpdate.itemName === undefined) {
            filter = {'item.positionInShoppingList': itemToUpdate.positionInShoppingList, 'conversationID': this.conversationID};
        } else if(itemToUpdate !== undefined) {
            filter = {'item.itemName': itemToUpdate.itemName, 'conversationID': this.conversationID};

        } else {
            throw new Error('Need itemNam or positionInShoppingList to update item');
        }
        collection.updateOne(filter, {
            conversationID: this.conversationID,
            item: itemToUpdate
        });
    } catch(err) {
        console.dir(err);
    } finally {
        // Ensures that the client will close when you finish/error
        await this.client.close();
      }
    }

 
}
