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