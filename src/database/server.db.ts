import faunadb from 'faunadb';
import config from '../data/config.json';
import { Server } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

export async function getServers(guildId: string) {
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

export async function getServer(guildId: string, token: string) {
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

export async function getServerByToken(token: string) {
    try {
        return await client.query(
            q.Get(q.Match(q.Index("game_server_by_token"), token))
        );
    }
    catch (err) {
        console.log(err);
        console.log('error getting game server by token');
        return undefined;
    }
}

export async function removeServer(guildId: string, token: string) {
    try {
        const gameServer: any = await getServer(guildId, token);
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

export async function addServer(newGameServer: Server) {
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

export async function updateServer(updatedServerData: Server, ref: any | undefined) {
    try {
        if (ref === undefined) {
            ref = await getServer(updatedServerData.guildId, updatedServerData.token);
            ref = ref.ref;
        }
        
        //const gameServer: any = await getServer(updatedServerData.guildId, updatedServerData.token);
        return await client.query(
            q.Update(
                ref,
                {
                    data: {
                        guildId: updatedServerData.guildId,
                        name: updatedServerData.name,
                        token: updatedServerData.token,
                        region: updatedServerData.region,
                        admins: updatedServerData.admins
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