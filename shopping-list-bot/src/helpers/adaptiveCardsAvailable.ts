import { Channels } from "botbuilder";

/**
 * Find out if a certain channel supports adaptive cards.
 * @param channelId of the channel the conversation with the bot is in.
 * @returns true if adaptive cards are available in this channel and false if adaptive cards are not available.
 * 
 * {@link https://docs.microsoft.com/en-us/adaptive-cards/resources/partners}
 */
export const adaptiveCardsAvailable = (channelId: string) => {
    return (channelId === Channels.Webchat || channelId === Channels.Cortana || channelId === Channels.Msteams || channelId ===  Channels.Emulator);
}

/**
 * Find out if a channel supports adaptive cards or converts adaptive cards to images.
 * @param channelId of the channel the conversation with the bot is in.
 * @returns false if the channel does not support adaptive cards at all. True if the channels supports adaptive cards or the channel converts adaptive cards to images.
 * {@link https://docs.microsoft.com/en-us/azure/bot-service/bot-service-channels-reference?view=azure-bot-service-4.0#card-support-by-channel}
 */
export const adaptiveCardsAsImageAvailable = (channelId: string) => {
    return (channelId === Channels.Twilio || channelId === Channels.Slack || channelId === Channels.Kik || channelId === Channels.Groupme || channelId === Channels.Email || adaptiveCardsAvailable(channelId));
}