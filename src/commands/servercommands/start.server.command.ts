// import discord from 'discord.js';
// import { DiscordMessageEmitter } from '../../emitters/discord.message.emitter';
// import { ServerCommandId, ServerState, SocketState } from '../../models/enumerations';
// import { enableMod, startServer} from '../../helpers/requests';
// import { getGameMods } from '../../database/mods.db';
// import config from '../../data/config.json';

// export default {
//     commandId: ServerCommandId.saves,
//     minArgCount: 0,
//     maxArgCount: 0,
//     format: `${config.bot.commandPrefix}${ServerCommandId.saves}`,
//     help: `Lists all saved games on the server`,
//     action: async (data: {
//         guildId: string,
//         serverName: string,
//         serverToken: string,
//         serverState: ServerState,
//         socketState: SocketState,
//         commandId: string,
//         args: string[],
//         message: discord.Message,
//         emitter: DiscordMessageEmitter
//     }) => {

//         // how can we get IP and game version easier?
//         // could store them both in the server object on the db i guess?
//         // so we could get them here... but that seems like a lot of shit to do
//         const slotId = data.args[0];
//         const validSlots = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8", "slot9"];

//         if (!validSlots.includes(slotId)) {
//             data.emitter.emit('sendGameServerMsg', data.serverName, `${slotId} is not a valid slot`);
//             return;
//         }

//         // confirm connected to socket
//         if (data.socketState === SocketState.Disconnected) {
//             data.emitter.emit('sendGameServerMsg', data.serverName, 'Attempting to re-establish connection with server, cannot perform server commands');
//             return;
//         }

//         switch (data.serverState) {
//             case ServerState.Online:
//                 data.emitter.emit('sendGameServerMsg', data.serverName, `Server online at ${data.serverIp}`);
//                 return;

//             case ServerState.Offline:
//                 // activate mods appropriate for slot
//                 const mods: any = await getGameMods(data.guildId, data.serverToken);
//                 if (mods != undefined) {
//                     data.emitter.emit('sendGameServerMsg', data.serverName, `Enabling mods for ${slotId}`);
//                     const requests = [];
//                     for (const mod of mods.data) {
//                         if (mod.data.activeOn.includes(slotId)) {
//                             requests.push(enableMod(data.visitSecret, mod.data.modId, true));
//                         }
//                         else {
//                             requests.push(enableMod(data.visitSecret, mod.data.modId, false));
//                         }
//                     }

//                     // send request
//                     await Promise.all(requests);
//                 }

//                 await startServer(data.visitSecret, 'us-west', slotId, data.gameVersion);
//                 return;

//             case ServerState.Starting:
//                 data.emitter.emit('sendGameServerMsg', data.serverName, 'Server is starting up');
//                 return;

//             case ServerState.Stopping:
//                 data.emitter.emit('sendGameServerMsg', data.serverName, 'Server is shutting down. Please wait for shutdown before requesting server launch');
//                 return;
//         }
//     }
// }