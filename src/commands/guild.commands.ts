import discord from 'discord.js';
import { GuildCommandId } from '../models/enumerations';
import config from '../data/config.json'

export class GuildCommands {
    guildCommandList: any[];

    constructor() {
        this.guildCommandList = [
            {
                commandId: GuildCommandId.servercreate,
                minArgCount: 1,
                maxArgCount: 1,
                format: `${config.bot.commandPrefix}${GuildCommandId.servercreate} serverName`,
                help: `Generates a new server token and adds server to server list`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.serveradd,
                minArgCount: 2,
                maxArgCount: 2,
                format: `${config.bot.commandPrefix}${GuildCommandId.serveradd} serverName serverToken`,
                help: `Adds a new server to server list`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.serverremove,
                minArgCount: 2,
                maxArgCount: 2,
                format: `${config.bot.commandPrefix}${GuildCommandId.serverremove} serverName serverToken`,
                help: `Removes a server from server list. Contents of server are unaffected and can be viewed at https://factorio.zone`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.list,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${GuildCommandId.list}`,
                help: `Lists all servers`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.servers,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${GuildCommandId.servers}`,
                help: `Lists all servers`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.cheats,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${GuildCommandId.cheats}`,
                help: `Lists helpful cheat commands. You will lose the ability to get achievements if you use these`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.newplayer,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${GuildCommandId.newplayer}`,
                help: `Sets user role to Factorio-Nerd, allowing user to view factorio servers`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            },
            {
                commandId: GuildCommandId.commands,
                minArgCount: 0,
                maxArgCount: 0,
                format: `${config.bot.commandPrefix}${GuildCommandId.commands}`,
                help: `return a list of available guild commands`,
                action: async (commandId: string, args: string[], message: discord.Message) => { }
            }
        ]
    }

    getGuildCommandHelp(commandId: string) {
        const self = this;
        const command = self.guildCommandList.find(c => c.commandId === commandId.toLowerCase());
        if (command === undefined) {
            return `That is not a command I recognize: ${commandId}`;
        }

        return `${command.format}
        ${command.help}`;
    }

    getGuildCommands() {
        const self = this;
        const helpEmbed = new discord.MessageEmbed();
        helpEmbed.setColor('#0099ff');
        helpEmbed.setTitle('Management Commands');

        for (const command of self.guildCommandList) {
            helpEmbed.addField(command.format, command.help);
        }

        return helpEmbed;
    }

    getGuildCommand(commandId: string) {
        const self = this;
        return self.guildCommandList.find(c => c.commandId === commandId.toLowerCase());
    }

    addGuildAction(commandId: string, action: (commandId: string, args: string[], message: discord.Message) => Promise<void>) {
        const self = this;
        const command = self.getGuildCommand(commandId);
        if (command !== undefined) {
            command.action = action;
        }
    }
}