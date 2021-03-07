/**
 * Unit in this domain is a measurement that specifies the amount of an {@link Item}.
 */
export class Unit {
    /**
     * What unit this object represents (i.e. kg, g, pound, ...).
     */
    unitName?: string;
    /**
     * The amount this {@link Unit} stores.
     */
    value: number;

    /**
     * Create a new {@link Unit} that stores {@link value} of {@link unitName} (i.e. 100 kg, ...).
     * @param unitName describing what {@link Unit} this is.
     * @param value for the new {@link Unit}.
     */
    constructor(unitName: string, value: number) {
        if (!value || value <= 0) {
            throw new Error('unit params are not valid');
        }
        this.unitName = unitName;
        this.value = value;
    }
}
