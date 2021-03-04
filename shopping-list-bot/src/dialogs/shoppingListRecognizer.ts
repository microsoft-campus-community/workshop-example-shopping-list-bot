import { RecognizerResult, TurnContext } from 'botbuilder';
import { LuisApplication, LuisRecognizer, LuisRecognizerOptionsV3 } from 'botbuilder-ai';
import { Unit } from '../models/unit';

/**
 * Provides functionality to use the LUIS shopping list service.
 */
export class ShoppingListRecognizer {
    private recognizer: LuisRecognizer;

    /**
     * @param config to use when calling the LUIS service. 
     */
    constructor(config: LuisApplication) {
        const luisIsConfigured = config && config.applicationId && config.endpoint && config.endpointKey;
        if (luisIsConfigured) {
            // Set the recognizer options depending on which endpoint version you want to use e.g LuisRecognizerOptionsV2 or LuisRecognizerOptionsV3.
            // More details can be found in https://docs.microsoft.com/en-gb/azure/cognitive-services/luis/luis-migration-api-v3
            const recognizerOptions: LuisRecognizerOptionsV3 = {
                apiVersion: 'v3'
            };

            this.recognizer = new LuisRecognizer(config, recognizerOptions);
        }
    }

    /**
     * Whether or not this recognizer is configured and ready to use to make calls to the LUIS API.
     * 
     * @returns true if this recognizer can be used to call the LUIS api. False otherwise.
     */
    public get isConfigured(): boolean {
        return (this.recognizer !== undefined);
    }

    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * 
     * Precondition: This LUIS recognizer was correctly configured and the LUIS endpoint is published.
     * @param {TurnContext} context of the bot with the message that LUIS should try to predict the intent and entities.
     * @return the information that LUIS could extract.
     */
    public async executeLuisQuery(context: TurnContext): Promise<RecognizerResult> {
        return this.recognizer.recognize(context);
    }


    /**
     * Parse the result of a call to LUIS to get the name of the item LUIS predicted.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns the name of the shopping list item contained in the LUIS result. Can be null if LUIS did not recognize an item name.
     */
    public getItemNameEntities(result: RecognizerResult): string {
        let itemName: string;
        if (result.entities.$instance.ItemName) {
            itemName = result.entities.$instance.ItemName[0].text;
        }
        return itemName;
    }

    /**
     * Parse the result of a call to LUIS to get the unit LUIS could recognize in the input of the corresponding LUIS call.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns the {@Link Unit} contained in the LUIS result. Can be null if LUIS did not recognize an unit.
     */
    public getUnitEntities(result: RecognizerResult): Unit {
        let unit: Unit;
        if (result.entities.$instance.number) {
            unit = new Unit();
            unit.value = result.entities.$instance.number[0].text;
            if (result.entities.UnitName) {
                unit.unitName = result.entities.UnitName[0][0];
            }
        }
        return unit;
    }

    /**
     * Parse the result of a call to LUIS to found out if LUIS could recognize a number that can be interpreted as a position of an item in the shopping list.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns true if LUIS could find an ordinal or number in the input of the LUIS API call. False if not.
     */
    public hasPositionEntity(result: RecognizerResult): boolean {
        return this.hasOrdinal(result) || this.hasNumber(result);
    }

    /**
     * Parse the result of a call to LUIS to found out if LUIS could recognize an ordinal.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns true if LUIS could find an ordinal in the input of the LUIS API call. False if not.
     */
    private hasOrdinal(result: RecognizerResult): boolean{
        return (result.entities.ordinal && result.entities.ordinal.length > 0);
    }

    /**
     * Parse the result of a call to LUIS to found out if LUIS could recognize a number.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns true if LUIS could find an number in the input of the LUIS API call. False if not.
     */
    private hasNumber(result: RecognizerResult): boolean{
        return (result.entities.number && result.entities.number.length > 0);
    }

    /**
     * Parse the result of a call to LUIS to get the position of an item in the shopping list LUIS could recognize in the input of the corresponding LUIS call.
     * 
     * Precondition: A result returned by a call to the LUIS API of the shopping list model. {@link executeLuisQuery}
     * @param result returned by the LUIS shopping list model.
     * @returns the position contained in the LUIS result. Is NaN if LUIS could not recognize a position.
     */
    public getPositionEntity(result: RecognizerResult): number{
        if(this.hasOrdinal(result)) {
            return result.entities.ordinal[0];
        } else if(this.hasNumber(result)) {
            return result.entities.number[0];
        } else {
            return NaN;
        }
    }
}
