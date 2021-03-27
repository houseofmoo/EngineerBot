import discord from 'discord.js';
import { ServerCommandId } from '../models/enumerations';
import config from '../data/config.json'

export class ServerCommands {
    serverCommandList: any[]

    constructor() {
        this.serverCommandList = [
            {
                commandId: ServerCommandId.saves,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.saves}`,
                help: `Lists all saved games on the server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.modinstall,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.modinstall} modName`,
                help: `Attempts to download and install mod to the server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.modupdate,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.modupdate} modName`,
                help: `Attempts to download latest version of mod to the server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.moddelete,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.moddelete} modName`,
                help: `Deletes mod from server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.modon,
                minArgCount: 1,
                maxArgCount: 99,
                format: `${config.bot.commandPrefix}${ServerCommandId.modon} slotId modName`,
                help: `Activate mod on slot`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.modoff,
                minArgCount: 1,
                maxArgCount: 99,
                format: `${config.bot.commandPrefix}${ServerCommandId.modoff} slotId modName`,
                help: `Deactivates mod on slot`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.mods,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.mods}`,
                help: `Lists all mods installed to server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.start,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.start} slotId`,
                help: `Start server using specified save slot`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.stop,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.stop}`,
                help: `Shut down server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.msg,
                minArgCount: 1,
                maxArgCount: 10000,
                format: `${config.bot.commandPrefix}${ServerCommandId.msg} messageContent`,
                help: 'Send a chat message to server',
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.promote,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.promote} username`,
                help: `Promote the player to game admin during this game session`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.promoteadd,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.promoteadd} username`,
                help: `Adds player to promote on join list`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.promoteremove,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${ServerCommandId.promoteremove} username`,
                help: `Removes player from promote on join list`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.promotelist,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.promotelist}`,
                help: `Lists players on the promote on join list`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.status,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.status}`,
                help: `information about the server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.info,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.info}`,
                help: `information about the server`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.cheats,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.cheats}`,
                help: `Lists helpful cheat commands`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: ServerCommandId.commands,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${ServerCommandId.commands}`,
                help: `return a list of available server commands`,
                action: async (commandId: string, args: string[],  message: discord.Message) => { }
            }
        ]
    }
   
    getServerCommandHelp(commandId: string): string {
        const self = this;
        const command = self.serverCommandList.find(c => c.commandId === commandId.toLowerCase());
        if (command === undefined) {
            return `That is not a command I recognize: ${commandId}`;
        }
    
        return `${command.format}
        ${command.help}`;
    }
    
    getServerCommands() {
        const self = this;
        const helpEmbed = new discord.MessageEmbed();
        helpEmbed.setColor('#0099ff');
        helpEmbed.setTitle('Server Commands');
    
        for (const command of self.serverCommandList) {
            helpEmbed.addField(command.format, command.help);
        }
    
        return helpEmbed;
    }
    
    getServerCommand(commandId: string) {
        const self = this;
        return self.serverCommandList.find(c => c.commandId === commandId.toLowerCase());
    }
    
    addServerAction(commandId: string, action: (commandId: string, args: string[],  message: discord.Message) => Promise<void>) {
        const self = this;
        const command = self.getServerCommand(commandId);
        if (command !== undefined) {
            command.action = action;
        }
    }
}