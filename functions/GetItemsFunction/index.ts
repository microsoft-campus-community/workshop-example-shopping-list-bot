import { AzureFunction, Context, HttpRequest, ContextBindings } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest, getShoppingListDocument: ContextBindings): Promise<void> {
    if (!context.bindingData.conversationID) {
        context.res = {
            status: 400,
            body: {
                message: 'invalid input: conversation id required'
            }
        };
        context.done();
    }
    const items = getShoppingListDocument.map(nestedItem => nestedItem.item);
    context.res = {
        status: 200,
        body: items
    };
    context.done();

};

export default httpTrigger;