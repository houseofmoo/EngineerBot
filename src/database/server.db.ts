import faunadb from 'faunadb';
import config from '../data/config.json';
import { Server } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

export async function getGameServers(guildId: string) {
    try {
        return await client.query(
            q.Map(
                q.Paginate(q.Match(q.Index("game_servers_by_guildId"), guildId)),
                q.Lambda("gameServerRef", q.Get(q.Var("gameServerRef")))
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error getting game servers by guild id');
        return undefined;
    }
}

export async function getGameServer(guildId: string, token: string) {
    try {
        return await client.query(
            q.Get(q.Match(q.Index("game_server_by_guildId_and_token"), guildId, token))
        );
    }
    catch (err) {
        console.log(err);
        console.log('error getting game server by guildId and token');
        return undefined;
    }
}

export async function removeGameServer(guildId: string, token: string) {
    try {
        const gameServer: any = await getGameServer(guildId, token);
        return await client.query(
            q.Delete(gameServer.ref)
        );
    }
    catch (err) {
        console.log(err);
        console.log('error adding game server');
        return undefined;
    }
}

export async function addGameServer(newGameServer: Server) {
    try {
        return await client.query(
            q.Create(
                q.Collection("game_servers"),
                {
                    data: {
                        guildId: newGameServer.guildId,
                        name: newGameServer.name,
                        token: newGameServer.token,
                        region: newGameServer.region,
                        version: newGameServer.version,
                        admins: newGameServer.admins
                    }
                }
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error adding game server');
        return undefined;
    }
}

export async function updateGameServer(newGameServerData: Server) {
    try {
        const gameServer: any = await getGameServer(newGameServerData.guildId, newGameServerData.token);
        return await client.query(
            q.Update(
                gameServer.ref,
                {
                    data: {
                        guildId: newGameServerData.guildId,
                        name: newGameServerData.name,
                        token: newGameServerData.token,
                        region: newGameServerData.region,
                        version: newGameServerData.version,
                        admins: newGameServerData.admins
                    }
                }
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error updating game server');
        return undefined;
    }
}