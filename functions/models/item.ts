import { ItemDb } from "./itemDb";
import { Unit } from "./unit";

export class Item extends ItemDb {
    public id?: string;
    constructor(itemName: string, marked: boolean, positionInShoppingList: number, unit?: Unit, id?: string) {
        super(itemName, marked, positionInShoppingList, unit);
       
        this.id = id;
    }
}
