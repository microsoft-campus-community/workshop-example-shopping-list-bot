import { Unit } from "./unit";

export class Item {
    public intent: string;
    public unit?: Unit;
    public itemName: string;
    public marked: boolean = false;
    public positionInShoppingList: number;
}
