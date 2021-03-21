/**
 * Represents a result that a dialog can pass to its parent once it is done.
 */
export interface IDialogResult {
    /**
     * The id of the dialog that produced this result.
     */
    dialogId: string
}