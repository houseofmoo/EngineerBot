import discord from 'discord.js';
import { ServerCommand } from '../models/command.id';
import config from '../data/config.json'

export class ServerCommands {
    serverCommandList: any[]

    constructor() {
        this.serverCommandList = [
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
                format: `${config.bot.commandPrefix}${ServerCommand.stop}`,
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