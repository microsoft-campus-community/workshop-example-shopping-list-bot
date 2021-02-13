import { Unit } from "./unit";

export class Item {
    public id?: string;
    public unit?: Unit;
    public itemName: string;
    public marked: boolean = false;
    public positionInShoppingList: number;

    constructor(itemName: string, marked: boolean, positionInShoppingList: number, unit?: Unit, id?: string) {
        if (!itemName || itemName === '' || positionInShoppingList <= 0) {
            throw new Error('item parameters are not valid');
        }
        this.itemName = itemName;
        this.marked = marked;
        this.positionInShoppingList = positionInShoppingList;
        this.unit = unit;
        this.id = id;
    }
}
