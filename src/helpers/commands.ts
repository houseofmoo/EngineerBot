import discord from 'discord.js'
import config from '../data/config.json';

export const guildCommandList = [
    {
        commandId: 'server-create',
        argCount: 1,
        format: `${config.bot.commandPrefix}server-create serverName`,
        help: `Generates a new server token and adds server to server list`
    },
    {
        commandId: 'server-add',
        argCount: 2,
        format: `${config.bot.commandPrefix}server-add serverName serverToken`,
        help: `Adds a new server to server list`
    },
    {
        commandId: 'server-remove',
        argCount: 1,
        format: `${config.bot.commandPrefix}server-remove serverName`,
        help: `Removes a server from server list. Contents of server are unaffected and can be viewed at https://factorio.zone`
    },
    {
        commandId: 'server-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}server-list`,
        help: `Lists all servers`
    },
    {
        commandId: 'cheats',
        argCount: 0,
        format: `${config.bot.commandPrefix}cheats`,
        help: `Lists helpful cheat commands. You will lose the ability to get achievements if you use these`
    },
    {
        commandId: 'commands',
        argCount: 0,
        format: `${config.bot.commandPrefix}commands`,
        help: `return a list of available guild commands`
    }
]

export const serverCommandList = [
    {
        commandId: 'save-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}save-list`,
        help: `Lists all saved games on the server`
    },
    {
        commandId: 'mod-install',
        argCount: 1,
        format: `${config.bot.commandPrefix}mod-install modName`,
        help: `Attempts to download and install mod to the server`
    },
    {
        commandId: 'mod-delete',
        argCount: 1,
        format: `${config.bot.commandPrefix}mod-delete modName`,
        help: `Deletes mod from server`
    },
    {
        commandId: 'mod-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}mod-list`,
        help: `Lists all mods installed to server`
    },
    {
        commandId: 'mod-update',
        argCount: 1,
        format: `${config.bot.commandPrefix}mod-update modName`,
        help: `Attempts to download latest version of mod to the server`
    },
    {
        commandId: 'start',
        argCount: 1,
        format: `${config.bot.commandPrefix}start slotName`,
        help: `Tell the sever to start the specified slot`
    },
    {
        commandId: 'stop',
        argCount: 0,
        format: `${config.bot.commandPrefix}stop`,
        help: `Tell server to shut down`
    },
    {
        commandId: 'msg',
        argCount: 1,    // just has to be more than 0
        format: `${config.bot.commandPrefix}msg messageContent`,
        help: 'Send a chat message to server'
    },
    {
        commandId: 'promote',
        argCount: 1,
        format: `${config.bot.commandPrefix}promote username`,
        help: `Promote the player to game admin during this game session`
    },
    {
        commandId: 'promote-add',
        argCount: 1,
        format: `${config.bot.commandPrefix}promote-add username`,
        help: `Adds player to promote on join list`
    },
    {
        commandId: 'promote-remove',
        argCount: 1,
        format: `${config.bot.commandPrefix}promote-remove username`,
        help: `Removes player from promote on join list`
    },
    {
        commandId: 'promote-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}promote-list`,
        help: `Lists players on the promote on join list`
    },
    {
        commandId: 'mod-activate',
        argCount: 2,    // second arg may contain spaces
        format: `${config.bot.commandPrefix}mod-activate slotId modName`,
        help: `Activate mod on slot`
    },
    {
        commandId: 'mod-deactivate',
        argCount: 2,    // second arg may contain spaces
        format: `${config.bot.commandPrefix}slot-mod-deactivate slotId modName`,
        help: `Deactivates mod on slot`
    },
    {
        commandId: 'commands',
        argCount: 0,
        format: `${config.bot.commandPrefix}commands`,
        help: `return a list of available server commands`
    }
]


export function getGuildCommandHelp(commandId: string) {
    const command = guildCommandList.find(c => c.commandId === commandId);
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
    return guildCommandList.find(c => c.commandId === commandId);
}

export function getServerCommandHelp(commandId: string): string {
    const command = serverCommandList.find(c => c.commandId === commandId);
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
    return serverCommandList.find(c => c.commandId === commandId);
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