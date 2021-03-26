import discord from 'discord.js'
import { GuildCommand, ServerCommand } from '../models/command.id';
import config from '../data/config.json';

export const guildCommandList = [
    {
        commandId: GuildCommand.servercreate,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${GuildCommand.servercreate} serverName`,
        help: `Generates a new server token and adds server to server list`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: GuildCommand.serveradd,
        minArgCount: 2,
        maxArgCount: 2,
        format: `${config.bot.commandPrefix}${GuildCommand.serveradd} serverName serverToken`,
        help: `Adds a new server to server list`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: GuildCommand.serverremove,
        minArgCount: 2,
        maxArgCount: 2,
        format: `${config.bot.commandPrefix}${GuildCommand.serverremove} serverName serverToken`,
        help: `Removes a server from server list. Contents of server are unaffected and can be viewed at https://factorio.zone`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: GuildCommand.serverlist,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${GuildCommand.serverlist}`,
        help: `Lists all servers`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: GuildCommand.cheats,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${GuildCommand.cheats}`,
        help: `Lists helpful cheat commands. You will lose the ability to get achievements if you use these`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: GuildCommand.commands,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${GuildCommand.commands}`,
        help: `return a list of available guild commands`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    }
]

export const serverCommandList = [
    {
        commandId: ServerCommand.saves,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${ServerCommand.saves}`,
        help: `Lists all saved games on the server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.modinstall,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.modinstall} modName`,
        help: `Attempts to download and install mod to the server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.modupdate,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.modupdate} modName`,
        help: `Attempts to download latest version of mod to the server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.moddelete,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.moddelete} modName`,
        help: `Deletes mod from server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.modon,
        minArgCount: 1,
        maxArgCount: 99,
        format: `${config.bot.commandPrefix}${ServerCommand.modon} slotId modName`,
        help: `Activate mod on slot`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.modoff,
        minArgCount: 1,
        maxArgCount: 99,
        format: `${config.bot.commandPrefix}${ServerCommand.modoff} slotId modName`,
        help: `Deactivates mod on slot`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.mods,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${ServerCommand.mods}`,
        help: `Lists all mods installed to server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.start,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.start} slotId`,
        help: `Start server using specified save slot`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.stop,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${ServerCommand.moddelete}`,
        help: `Shut down server`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.msg,
        minArgCount: 1,
        maxArgCount: 10000,
        format: `${config.bot.commandPrefix}${ServerCommand.msg} messageContent`,
        help: 'Send a chat message to server',
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.promote,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.promote} username`,
        help: `Promote the player to game admin during this game session`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.promoteadd,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.promoteadd} username`,
        help: `Adds player to promote on join list`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.promoteremove,
        minArgCount: 1,
        maxArgCount: 1,
        format: `${config.bot.commandPrefix}${ServerCommand.promoteremove} username`,
        help: `Removes player from promote on join list`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.promotelist,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${ServerCommand.promotelist}`,
        help: `Lists players on the promote on join list`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    },
    {
        commandId: ServerCommand.commands,
        minArgCount: 0,
        maxArgCount: 0,
        format: `${config.bot.commandPrefix}${ServerCommand.commands}`,
        help: `return a list of available server commands`,
        action: async (commandId: string, args: string[],  message: discord.Message) => { }
    }
]

export function getGuildCommandHelp(commandId: string) {
    const command = guildCommandList.find(c => c.commandId === commandId.toLowerCase());
    if (command === undefined) {
        return `That is not a command I recognize: ${commandId}`;
    }

    return `${command.format}
    ${command.help}`;
}

export function getGuildCommands() {
    const helpEmbed = new discord.MessageEmbed();
    helpEmbed.setColor('#0099ff');
    helpEmbed.setTitle('Management Commands');

    for (const command of guildCommandList) {
        helpEmbed.addField(command.format, command.help);
    }

    return helpEmbed;
}

export function getGuildCommand(commandId: string) {
    return guildCommandList.find(c => c.commandId === commandId.toLowerCase());
}

export function addGuildAction(commandId: string, action: (commandId: string, args: string[],  message: discord.Message) => Promise<void>) {
    const command = getGuildCommand(commandId);
    if (command !== undefined) {
        command.action = action;
    }
}

export function getServerCommandHelp(commandId: string): string {
    const command = serverCommandList.find(c => c.commandId === commandId.toLowerCase());
    if (command === undefined) {
        return `That is not a command I recognize: ${commandId}`;
    }

    return `${command.format}
    ${command.help}`;
}

export function getServerCommands() {
    const helpEmbed = new discord.MessageEmbed();
    helpEmbed.setColor('#0099ff');
    helpEmbed.setTitle('Server Commands');

    for (const command of serverCommandList) {
        helpEmbed.addField(command.format, command.help);
    }

    return helpEmbed;
}

export function getServerCommand(commandId: string) {
    return serverCommandList.find(c => c.commandId === commandId.toLowerCase());
}

export function addServerAction(commandId: string, action: (commandId: string, args: string[],  message: discord.Message) => Promise<void>) {
    const command = getServerCommand(commandId);
    if (command !== undefined) {
        command.action = action;
    }
}

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