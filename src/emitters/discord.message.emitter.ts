import { TypedEmitter } from 'tiny-typed-emitter';
import discord from 'discord.js';

interface IDiscordMessageEmitter {
    sendManagementMsg: (msg: string | discord.MessageEmbed) => void;
    sendGameServerMsg: (serverName: string, msg: string | discord.MessageEmbed) => void;
    sendToGameServerWebHook: (serverName: string, msg: string | discord.MessageEmbed, username: string) => void;
};

export class DiscordMessageEmitter extends TypedEmitter<IDiscordMessageEmitter> {
    constructor() {
        super();
    }
}