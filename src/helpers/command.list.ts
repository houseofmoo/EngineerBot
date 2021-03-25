import config from '../data/config.json';

export const guildCommandList = [
    {
        commandId: 'server-create',
        argCount: 1,
        format: `${config.bot.commandPrefix}server-create serverName`,
        help: `Generates a new server token and server to server list`
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
        help: `Removes a server from server list. Contents of server are unaffected and can be viewed at factorio.zone`
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
        help: `return a list of available commands`
    }
]

export const serverCommandList = [
    {
        commandId: 'slot-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}slot-list`,
        help: `Lists all slots on a server`
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
        help: `Deletes mod from server. All slots that used that mod will have it removed`
    },
    {
        commandId: 'server-mod-list',
        argCount: 0,
        format: `${config.bot.commandPrefix}server-mod-list`,
        help: `Lists all mods installed to server`
    },
    {
        commandId: 'mod-update',
        argCount: 1,
        format: `${config.bot.commandPrefix}mod-update modName`,
        help: `Attempts to download and activate latest version of mod. Slots will be updated as well.`
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
        argCount: 2,
        format: `${config.bot.commandPrefix}mod-activate slotName modName`,
        help: `Attempts to activate mod on slot. If mod not existing on server will download mod. Dependencies may not be downloaded`
    },
    {
        commandId: 'mod-deactivate',
        argCount: 2,
        format: `${config.bot.commandPrefix}slot-mod-deactivate slotName modName`,
        help: `Deactivates mod on slot`
    },
    {
        commandId: 'slot-mod-list',
        argCount: 1,
        format: `${config.bot.commandPrefix}slot-mod-list slotName`,
        help: `Lists all mods active on slot`
    },
    {
        commandId: 'commands',
        argCount: 0,
        format: `${config.bot.commandPrefix}commands`,
        help: `return a list of available commands`
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

export function getGuildCommands(): string {
    // TODO: this will return an embed?
    return 'a list of guild commands';
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
    // todo: return embed of list of server commands
    return 'a list of server commands';
}

export function getServerCommand(commandId: string) {
    return serverCommandList.find(c => c.commandId === commandId);
}