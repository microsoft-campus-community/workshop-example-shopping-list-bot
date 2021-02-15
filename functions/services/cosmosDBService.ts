import { Item } from "../models/item";
import { FilterQuery, MongoClient, ObjectId } from 'mongodb';
import { ItemDb } from "../models/itemDb";

/**
 * Service for operations on ComosDB using the MongoDB API.
 * In particular, the following operations are supported:
 * - Add: Adds a new item to the shopping list item container
 * - Remove all: Removes all items for the specified conversation id of the container
 * - Remove by ID: Removes the item with specified unique id from the container
 * - Get all: Retrieves all items for the specified conversation id from the container.
 * - Update: Updates given properties of a item specified by its id in the container.
 */
export class CosmosDBService {

    private readonly client: MongoClient;
    private readonly conversationID: string;

    /**
     * Initializes a Mongo Client within the CosmosDBService.
     *
     * Precondition: conversation id must not be undefinied or emptry string and environment variable must contain valid credentials for CosmosDB.
     * Postcondition: Sets the conversation id and initializes a Mongo client for given CosmosDB credentials (using MongoDB API) or throws an error.
     * @param conversationID the id of the chat conversation set by the chat bot.
     */
    constructor(conversationID: string) {
        if (!conversationID || conversationID === '') {
            throw new Error('Illegal value for conversationID');
        }
        this.conversationID = conversationID;
        this.client = new MongoClient(process.env.SHOPPING_LIST_COSMOSDB, { useUnifiedTopology: true });
    }

    /**
     * Adds a new item to the shopping list.
     *
     * Retrieves the number of items in the shopping list of the {@link conversationID}.
     * Sets the increases the number by one and sets it as position in shopping list for the item to be added.
     *
     * Precondition: Item and item's name must not be undefined and item's name must not be an empty string.
     * Postcondition: The given item is added to the shopping list with last position in shopping list and the added item is returned.
     *      An error is thrown if an DB API call failed.
     * @param item the item to be added.
     * @returns the item which was added.
     */
    public async addItem(item: Item): Promise<Item> {
        if (!item || !item.itemName || item.itemName === '') {
            throw new Error('Illegal value for item');
        }
        try {
            const collection = await this.connectAndGetCollection();
            const positionInShoppingList: number = await collection.find({ conversationID: this.conversationID }).count() + 1;
            return (await collection.insertOne({
                conversationID: this.conversationID,
                item: new ItemDb(item.itemName, item.marked, positionInShoppingList, item.unit)
            })).ops[0].item;
        } finally {
            await this.client.close();
        }
    }

    /**
     * Removes all items for a {@link conversationID}.
     *
     * Postcondition: All items for the conversation id are removed from the container.
     *      An error is thrown if the DB API call failed.
     */
    public async removeAllItems(): Promise<void> {
        try {
            const collection = await this.connectAndGetCollection();
            await collection.deleteMany({ conversationID: this.conversationID });
        } finally {
            await this.client.close();
        }
    }



    /**
     * Updates the given parts of an item in the shopping list identified by its unique id.
     *
     * Precondition: itemId and itemToUpdate must not be undefinied and itemId must not be an empty string.
     * Postcondition: Updates the given members of the identified item.
     *      An error is thrown if the DB API call failed.
     * @param itemId unique id of the item to be updated.
     * @param itemToUpdate parts of the item which should be updated, containing the new values.
     * @returns the item which was updated already containing the new values.
     */
    public async updateItem(itemId: string, itemToUpdate: Partial<Item>): Promise<Item> {
        if (!itemId || itemId === '' || !itemToUpdate) {
            throw new Error('Illegal value for at least one parameter');
        }
        try {
            const collection = await this.connectAndGetCollection();
            const filter: FilterQuery<any> = { 'conversationID': this.conversationID, '_id': new ObjectId(itemId) };
            const markedUpdate = itemToUpdate.marked === undefined ? undefined : { 'item.marked': itemToUpdate.marked };
            const unitUpdate = itemToUpdate.unit === undefined ? undefined : { 'item.unit': itemToUpdate.unit };
            const itemNameUpdate = itemToUpdate.itemName === undefined ? undefined : { 'item.itemName': itemToUpdate.itemName };
            const updatedDbItem = {
                ...markedUpdate,
                ...unitUpdate,
                ...itemNameUpdate

            };
            return (await collection.findOneAndUpdate(filter, { $set: updatedDbItem }, { returnOriginal: false })).value.item;
        } finally {
            // Ensures that the client will close when you finish/error
            await this.client.close();
        }
    }

    /**
     * Removes a item with given id from the shopping list.
     * Updates decreases the position in shopping list for all items of the same conversation which position is greater than the deleted one.
     *
     * Precondition: itemId must not be undefined or empty string.
     * Postcondition: the item with given id is removed and the positions of the items with greater position are decreased by one.
     *      An error is thrown if the DB API call failed.
     * @param itemId the unique identifier of the item to be removed from the shopping list.
     */
    public async removeItemByID(itemId: string): Promise<void> {
        if (!itemId || itemId === '') {
            throw new Error('Illegal value for id');
        }
        try {
            const collection = await this.connectAndGetCollection();
            const deletedItem: Item = (await collection.findOneAndDelete({ 'conversationID': this.conversationID, '_id': new ObjectId(itemId) })).value.item;
            const positionOfDeletedItem = deletedItem.positionInShoppingList;
            await collection.updateMany({ 'conversationID': this.conversationID, 'item.positionInShoppingList': { $gt: positionOfDeletedItem } }, { $inc: { 'item.positionInShoppingList': -1 } });
        } finally {
            await this.client.close();
        }
    }

    /**
     * Retrieves all items of the {@link conversationID}'s shopping list.
     *
     * Postcondition: all items in the {@link conversationID}'s shopping list are retrieved.
     *      An error is thrown if the DB API call failed.
     * @returns all items in the {@link conversationID}'s shopping list.
     */
    public async getAllItems(): Promise<Item[]> {
        try {
            const collection = await this.connectAndGetCollection();
            const findResult = await collection.find({ conversationID: this.conversationID }).toArray();

            const result = findResult.map(dbDocument => {
                const item: Item = dbDocument.item;
                item.id = dbDocument._id;
                return item;
            });
            return result;
        } finally {
            await this.client.close();
        }
    };

    /**
     * Connects the client and returns the collection of the shopping list's items.
     * @returns The collection of the item's container.
     */
    private async connectAndGetCollection() {
        await this.client.connect();
        const database = this.client.db('shopping-list-db');
        const collection = database.collection('ItemsContainer');
        return collection;
    }
}
