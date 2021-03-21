/**
 * A unit measurement describes a physical quantity (i.e. 100 kg).
 */
export class Unit {
    /**
     * What unit this is (i.e. kg, gram, pound, ...).
     */
    unitName?: string;
    /**
     * The numerical value this unit represents.
     */
    value: number;
}
