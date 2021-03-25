import faunadb from 'faunadb';
import { EFAULT } from 'node:constants';
import config from '../data/config.json';
import { GameMod } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

export async function getGameMods(guildId: string, token: string) {
    try {
        return await client.query(
            q.Map(
                q.Paginate(q.Match(q.Index("mods_by_guildId_and_token"), guildId, token)),
                q.Lambda("modRef", q.Get(q.Var("modRef")))
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error while getting game mods by guildId and token');
        return undefined;
    }
}

export async function getGameMod(guildId: string, token: string, modName: string) {
    try {
        return await client.query(
            q.Get(q.Match(q.Index("mod_by_guildId_token_and_name"), guildId, token, modName))
        );
    }
    catch (err) {
        console.log(err);
        console.log('error getting mod by guildId token and name');
        return undefined;
    }
}

export async function removeGameMod(guildId: string, token: string, modName: string) {
    try {
        const mod: any = await getGameMod(guildId, token, modName);
        if (mod !== undefined) {
            return await q.Delete(mod.ref);
        }

        return undefined;
    }
    catch (err) {
        console.log(err);
        console.log('error getting mod by guildId token and name');
        return undefined;
    }
}

export async function removeAllMods(guildId: string, token: string) {
    try {
        const modsList: any = await getGameMods(guildId, token);
        if (modsList !== undefined) {
            for (const mod of modsList.data) {
                await client.query(
                    q.Delete(mod.ref)
                );
            }
        }

        return modsList;
    }
    catch (err) {
        console.log(err);
        console.log('error while removing game mods by guildId and token');
        return undefined;
    }
}

// add game mods document when a new game server document is created
export async function addGameMod(newMod: GameMod) {
    try {
        return await client.query(
            q.Create(
                q.Collection("mods"),
                {
                    data: {
                        guildId: newMod.guildId,
                        token: newMod.token,
                        name: newMod.name,
                        version: newMod.version,
                        modId: newMod.modId,
                        activeOn: newMod.activeOn
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
export async function updateGameMod(modifiedMod: GameMod, ref: any | undefined) {
    try {
        if (ref === undefined) {
            ref = await getGameMod(modifiedMod.guildId, modifiedMod.token, modifiedMod.name);
            ref = ref.ref;
        }

        return await client.query(
            q.Update(
                ref,
                {
                    data: {
                        guildId: modifiedMod.guildId,
                        token: modifiedMod.token,
                        name: modifiedMod.name,
                        version: modifiedMod.version,
                        modId: modifiedMod.modId,
                        activeOn: modifiedMod.activeOn
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