// Licensed under the MIT License.
import { RecognizerResult, TurnContext } from 'botbuilder';
import { LuisApplication, LuisRecognizer, LuisRecognizerOptionsV3 } from 'botbuilder-ai';
import { Unit } from '../models/unit';

export class ShoppingListRecognizer {
    private recognizer: LuisRecognizer;

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

    public get isConfigured(): boolean {
        return (this.recognizer !== undefined);
    }

    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {TurnContext} context
     */
    public async executeLuisQuery(context: TurnContext): Promise<RecognizerResult> {
        return this.recognizer.recognize(context);
    }

    public getItemNameEntities(result: RecognizerResult): string {
        let itemName: string;
        if (result.entities.$instance.ItemName) {
            itemName = result.entities.$instance.ItemName[0].text;
        }
        return itemName;
    }

    public getUnitEntities(result: RecognizerResult): Unit {
        let unit;
        if (result.entities.$instance.number) {
            unit = new Unit();
            unit.value = result.entities.$instance.number[0].text;
            if (result.entities.UnitName) {
                unit.unitName = result.entities.UnitName[0][0];
            }
        }
        return unit;
    }

    public hasPositionEntity(result: RecognizerResult): boolean {
        return this.hasOrdinal(result) || this.hasNumber(result);
    }

    private hasOrdinal(result: RecognizerResult): boolean{
        return (result.entities.ordinal && result.entities.ordinal.length > 0);
    }

    private hasNumber(result: RecognizerResult): boolean{
        return (result.entities.number && result.entities.number.length > 0);
    }

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
