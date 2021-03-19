import config from '../data/config.json';

export const commandList = [
    {
        commandId: 'server-create',
        format: `${config.bot.commandPrefix}server-create serverName`,
        help: `Generates a new server token and server to server list`
    },
    {
        commandId: 'server-add',
        format: `${config.bot.commandPrefix}server-add serverName serverToken`,
        help: `Adds a new server to server list`
    },
    {
        commandId: 'server-remove',
        format: `${config.bot.commandPrefix}server-remove serverName`,
        help: `Removes a server from server list. Contents of server are unaffected and can be viewed at factorio.zone`
    },
    {
        commandId: 'server-list',
        format: `${config.bot.commandPrefix}server-list`,
        help: `Lists all servers`
    },
    {
        commandId: 'cheats',
        format: `${config.bot.commandPrefix}cheats`,
        help: `Lists helpful cheat commands. You will lose the ability to get achievements if you use these`
    },
    {
        commandId: 'server-slot-list',
        format: `${config.bot.commandPrefix}server-slot-list serverName`,
        help: `Lists all slots on a server`
    },
    {
        commandId: 'server-mod-install',
        format: `${config.bot.commandPrefix}server-mod-install serverName modName`,
        help: `Attempts to download and install mod to the server`
    },
    {
        commandId: 'server-mod-delete',
        format: `${config.bot.commandPrefix}server-mod-delete serverName modName`,
        help: `Deletes mod from server. All slots that used that mod will have it removed`
    },
    {
        commandId: 'server-mod-list',
        format: `${config.bot.commandPrefix}server-mod-list serverName`,
        help: `Lists all mods installed to server`
    },
    {
        commandId: 'server-mod-update',
        format: `${config.bot.commandPrefix}server-mod-update serverName modName`,
        help: `Attempts to download and activate latest version of mod. Slots will be updated as well.`
    },
    {
        commandId: 'server-start',
        format: `${config.bot.commandPrefix}server-start serverName slotName`,
        help: `Tell the sever to start the specified slot`
    },
    {
        commandId: 'server-stop',
        format: `${config.bot.commandPrefix}server-stop serverName`,
        help: `Tell server to shut down`
    },
    {
        commandId: 'promote',
        format: `${config.bot.commandPrefix}promote serverName username`,
        help: `Promote the player to game admin during this game session`
    },
    {
        commandId: 'promote-add',
        format: `${config.bot.commandPrefix}promote-add serverName username`,
        help: `Adds player to promote on join list`
    },
    {
        commandId: 'promote-remove',
        format: `${config.bot.commandPrefix}promote-remove serverName username`,
        help: `Removes player from promote on join list`
    },
    {
        commandId: 'promote-list',
        format: `${config.bot.commandPrefix}promote-list serverName`,
        help: `Lists players on the promote on join list`
    },
    {
        commandId: 'slot-mod-activate',
        format: `${config.bot.commandPrefix}slot-mod-activate serverName slotName modName`,
        help: `Attempts to activate mod on slot. If mod not existing on server will download mod. Dependencies may not be downloaded`
    },
    {
        commandId: 'slot-mod-deactivate',
        format: `${config.bot.commandPrefix}slot-mod-deactivate serverName slotName modName`,
        help: `Deactivates mod on slot`
    },
    {
        commandId: 'slot-mod-list',
        format: `${config.bot.commandPrefix}slot-mod-list serverName slotName`,
        help: `Lists all mods active on slot`
    },
]

// returns the help information about a command
export function getCommandHelp(commandId: string): string {
    const command = commandList.find(c => c.commandId === commandId);
    if (command === undefined) {
        return `That is not a command I recognize: ${commandId}`;
    }

    return `${command.format}
${command.help}`;
}

export function getAllCommandHelp(): string {
    // TODO: this will return an embed?
    return 'not yet implemented';
}