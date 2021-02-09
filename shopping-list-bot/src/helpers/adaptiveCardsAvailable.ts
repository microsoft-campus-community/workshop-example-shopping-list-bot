export const adaptiveCardsAvailable = (channelId: string) => {
    return channelId === "webchat" || channelId === "cortana" || channelId === "Microsoft Teams" || "emulator";
}

export const adaptiveCardsAsImageAvailable = (channelId: string) => {
    return channelId === "twilio" || channelId === "slack" || channelId === "kik" || channelId === "GroupMe" || channelId === "Email" || adaptiveCardsAvailable(channelId);
}