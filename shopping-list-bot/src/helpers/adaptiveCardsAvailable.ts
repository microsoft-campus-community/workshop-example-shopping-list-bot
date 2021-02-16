import { Channels } from "botbuilder";

export const adaptiveCardsAvailable = (channelId: string) => {
    if(channelId === Channels.Webchat || channelId === Channels.Cortana || channelId === Channels.Msteams || Channels.Emulator) {
        return true;
    }
    return false;
}

export const adaptiveCardsAsImageAvailable = (channelId: string) => {
    if (channelId === Channels.Twilio || channelId === Channels.Slack || channelId === Channels.Kik || channelId === Channels.Groupme || channelId === Channels.Email || adaptiveCardsAvailable(channelId)) {
        return true;
    } else {
        return false;
    }
}