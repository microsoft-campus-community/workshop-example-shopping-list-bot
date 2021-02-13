import { Unit } from "./unit";

export class Item {
    public intent: string;
    public id?: string;
    public itemName: string;
    public marked: boolean = false;
    public positionInShoppingList: number;
    public unit?: Unit;
}
