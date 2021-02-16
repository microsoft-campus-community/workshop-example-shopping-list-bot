import { Unit } from "./unit";

export class Item {
    public intent: string;
    public id?: string;
    public itemName: string;
    public marked: boolean = false;
    public positionInShoppingList: number;
    public unit?: Unit;

}

export const itemAsTextMessage = (item: Item) => {
    let unitText = '';
            if (item.unit) {
                unitText = item.unit.unitName ? `${item.unit.value} ${item.unit.unitName} `: `${item.unit.value.toString()} `;
            }
            return `${unitText}${item.itemName}`;
}
