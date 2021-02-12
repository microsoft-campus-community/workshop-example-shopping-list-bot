import { Unit } from "./unit";

export class Item {
    public intent: string;
    public unit?: Unit;
    public itemName: string;
    public marked: boolean = false;
    public positionInShoppingList: number;

    toString(): string {
        
            let unitText = '';
            if (this.unit) {
                unitText = this.unit.unitName ? `${this.unit.value} ${this.unit.unitName} `: this.unit.value.toString();
            }
            return `${unitText}${this.itemName}`;
       
    }
}
