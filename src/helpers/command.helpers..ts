import discord from 'discord.js'
import config from '../data/config.json';

// returns command provided from discord message
export function getCommandFromMessage(message: discord.Message): string {
    // parse message into arguments
    let args = message.content.slice(config.bot.commandPrefix.length).trim().split(/ +/);

    // get first index, thats the command
    let command = args.shift();

    if (command !== undefined) {
        return command.toLowerCase();
    }

    return 'none';
}

// returns arguments provided from discord message
export function getCommandArgsFromMessage(message: discord.Message): string[] {
    let args = message.content.slice(config.bot.commandPrefix.length).split(/ +/);
    args.shift();   // we don't care about the first element, that is the command
    return args;    // return just the args
}