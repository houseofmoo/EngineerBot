import discord from 'discord.js';
import { DiscordMessageEmitter } from '../../emitters/discord.message.emitter';
import { ServerCommandId, ServerState, SocketState } from '../../models/enumerations';
import { getSaves } from '../../database/saves.db';
import config from '../../data/config.json';

export default {
    commandId: ServerCommandId.saves,
    minArgCount: 0,
    maxArgCount: 0,
    format: `${config.bot.commandPrefix}${ServerCommandId.saves}`,
    help: `Lists all saved games on the server`,
    action: async (data: {
            guildId: string,
            serverName: string,
            serverToken: string,
            serverState: ServerState,
            socketState: SocketState,
            commandId: string,
            args: string[],
            message: discord.Message,
            emitter: DiscordMessageEmitter
        }) => {

        const saves: any = await getSaves(data.guildId, data.serverToken);

        const savesEmbed = new discord.MessageEmbed();
        savesEmbed.setColor('#0099ff');
        savesEmbed.setTitle('Save Slots');
        savesEmbed.addField('slot1', saves.data.slot1);
        savesEmbed.addField('slot2', saves.data.slot2);
        savesEmbed.addField('slot3', saves.data.slot3);
        savesEmbed.addField('slot4', saves.data.slot4);
        savesEmbed.addField('slot5', saves.data.slot5);
        savesEmbed.addField('slot6', saves.data.slot6);
        savesEmbed.addField('slot7', saves.data.slot7);
        savesEmbed.addField('slot8', saves.data.slot8);
        savesEmbed.addField('slot9', saves.data.slot9);

        data.emitter.emit('sendGameServerMsg', data.serverName, savesEmbed);
    }
}
