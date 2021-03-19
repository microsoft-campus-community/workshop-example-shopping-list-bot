import { ItemDb } from "./itemDb";
import { Unit } from "./unit";

/**
 * An entry in a shopping list.
 * 
 * {@link ItemDb}
 */
export class Item extends ItemDb {
    /**
     * Automatically generated UUID to uniquely identify an item globally.
     */
    public id?: string;
    constructor(itemName: string, marked: boolean, positionInShoppingList: number, unit?: Unit, id?: string) {
        super(itemName, marked, positionInShoppingList, unit);
       
        this.id = id;
    }
}
