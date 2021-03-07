import { Unit } from "./unit";

/**
 * An item in the shopping list.
 * 
 * Use for write operations on the shopping list database.
 * 
 * Specific for database where id property is set automatically.
 * As such we do not want to allow modification of id's which is why this class does not contain an id property.
 * 
 * {@link Item} represents an item as it is stored in the database.
 */
export class ItemDb {
    /**
     * Measurement of how much this item is in the shopping list.
     */
    public unit?: Unit;
    /**
     * Name of the item itself.
     */
    public itemName: string;
    /**
     * True means this item is completed.
     * False means that is item is not yet completed.
     */
    public marked: boolean = false;
    /**
     * Numerical order within a shopping list. First item in a shopping list has position 1.
     * Last item in a shopping list has position number of items in the shopping list.
     * 
     * Must be unique for each item in the same shopping list.
     *
     */
    public positionInShoppingList: number;

    constructor(itemName: string, marked: boolean, positionInShoppingList: number, unit?: Unit) {
        if (!itemName || itemName === '' || positionInShoppingList <= 0) {
            throw new Error('item parameters are not valid');
        }
        this.itemName = itemName;
        this.marked = marked;
        this.positionInShoppingList = positionInShoppingList;
        this.unit = unit;
    }
}
