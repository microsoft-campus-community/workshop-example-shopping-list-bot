import { Unit } from "./unit";

/**
 * Represents an item in a shopping list.
 */
export class Item {
    public intent: string;
    /**
     * Unique id within a shopping list.
     */
    public id?: string;
    /**
     * How this item is called (i.e. 'Banana', 'Apple', ...).
     */
    public itemName: string;
    /**
     * True means this item is completed.
     * False means that the owner of the shopping list have not yet completed this item.
     */
    public marked: boolean = false;
    /**
     * Position of the item in the shopping list.
     * The first item in the shopping list has position 1.
     */
    public positionInShoppingList: number;
    /**
     * A unit describing the shopping list item more detailed.
     */
    public unit?: Unit;

}

/**
 * Format an item as a string.
 * Not implemented with ```toString()``` so that JSON conforming to the {@link Item} class can be also passed to this function.
 * Because JavaScript has no type information during runtime available an {@link Item} object received from JSON and not created with ```new Item()``` would not have the ```toString``` method of the {@link Item} class.
 * @param item to convert into a textual chat message representation.
 * @returns a {@link string} that represents the {@link item} in a human readable way.
 */
export const itemAsTextMessage = (item: Item) => {
    let unitText = '';
            if (item.unit) {
                unitText = item.unit.unitName ? `${item.unit.value} ${item.unit.unitName} `: `${item.unit.value.toString()} `;
            }
            return `${unitText}${item.itemName}`;
}

/**
 * Search a list of {@link Item}'s for a certain {@link itemToFind} with limited information available.
 * @param items to search through.
 * @param itemToFind everything known about the {@link Item} to find.
 * @returns all the {@link Item}'s as they appear in {@link items} that match the information provided with {@link itemToFind}.
 */
export const findItemInList = (items: Item[], itemToFind: Partial<Item>): Item[] => {
    if(itemToFind.id) {
        return items.filter(item => item.id === itemToFind.id);
    } else if(itemToFind.positionInShoppingList) {
        return items.filter(item => item.positionInShoppingList === itemToFind.positionInShoppingList);
    } else if(itemToFind.itemName) {
       return  items.filter(item => item.itemName === itemToFind.itemName);
    } else {
        return [];
    }
}