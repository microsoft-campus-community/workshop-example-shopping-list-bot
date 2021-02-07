export class Unit {
    unitName?: string;
    value: number;

    constructor(unitName: string, value: number) {
        if (!value || value <= 0) {
            throw new Error('unit params are not valid');
        }
        this.unitName = unitName;
        this.value = value;

    }
}
