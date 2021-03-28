import { TypedEmitter } from 'tiny-typed-emitter';
import discord from 'discord.js';

interface IDiscordMessageEmitter {
    sendManagementMsg: (msg: string | discord.MessageEmbed) => void;
    sendGameServerMsg: (serverName: string, msg: string | discord.MessageEmbed) => void;
    pinGameServerMsg: (serverName: string, msg: string | discord.MessageEmbed) => void;
};

export class DiscordMessageEmitter extends TypedEmitter<IDiscordMessageEmitter> {
    constructor() {
        super();
    }
}