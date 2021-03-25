import faunadb from 'faunadb';
import config from '../data/config.json';
import { ServerMods, GameMod } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

export async function getGameMods(guildId: string, token: string) {
    try {
        return await client.query(
            q.Get(q.Match(q.Index("mods_by_guildId_and_token"), guildId, token))
        );
    }
    catch (err) {
        console.log(err);
        console.log('error while getting game mods by guildId and token');
        return undefined;
    }
}

// remove game mods document when a game server document is removed
export async function removeGameMods(guildId: string, token: string) {
    try {
        const modList: any = await getGameMods(guildId, token);
        return await client.query(
            q.Delete(modList.ref)
        );
    }
    catch (err) {
        console.log(err);
        console.log('error while removing game mods document');
        return undefined;
    }
}

// add game mods document when a new game server document is created
export async function addGameMods(guildId: string, token: string) {
    try {
        return await client.query(
            q.Create(
                q.Collection("mods"),
                {
                    data: {
                        guildId: guildId,
                        token: token,
                        mods: []
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while adding game mods document');
        return undefined;
    }
}

// update name, version or modId of existing mod
export async function updateGameMod(guildId: string, token: string, modifiedMod: GameMod) {
    try {
        const modList: any = await getGameMods(guildId, token);
        const mod = modList.data.mods.find((m:any) => m.name === modifiedMod.name);
        mod.version = modifiedMod.version;
        mod.modId = modifiedMod.modId;
        mod.activeOn = modifiedMod.activeOn;

        return await client.query(
            q.Update(
                modList.ref,
                {
                    data: {
                        mods: modList.data.mods
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while adding game mods document');
        return undefined;
    }
}

// add a new game mod to a existing mod list
export async function addGameMod(guildId: string, token: string, newMod: GameMod) {
    try {
        const modList: any = await getGameMods(guildId, token);
        modList.data.mods.push({
            name: newMod.name,
            version: newMod.version,
            modId: newMod.modId,
        });
    
        return await client.query(
            q.Update(
                modList.ref,
                {
                    data: {
                        mods: modList
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while adding game mod');
        return undefined;
    }
}

// remove a game mod from existing mod list
export async function removeGameMod(guildId: string, token: string, modName: string) {
    try {
        const modList: any = await getGameMods(guildId, token);
        const modIndex = modList.findIndex((m:any) => m.name === modName);
        modList.splice(modIndex, 1);
    
        return await client.query(
            q.Update(
                modList.ref,
                {
                    data: {
                        mods: modList
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while removing game mod');
        return undefined;
    }
}

export async function replaceGameMods(mods: ServerMods) {
    try {
        const modList: any = await getGameMods(mods.guildId, mods.token);
        return await client.query(
            q.Update(
                modList.ref,
                {
                    data: {
                        guildId: mods.guildId,
                        token: mods.token,
                        mods: mods.mods
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while replacing game mods document');
        return undefined;
    }
}