import faunadb from 'faunadb';
import config from '../data/config.json';
import { ServerSaves } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

// add saves data document
export async function addSaves(guildId: string, token: string) {
    try {
        return await client.query(
            q.Create(
                q.Collection("saves"),
                {
                    data: {
                        guildId: guildId,
                        token: token,
                        slot1: "",
                        slot2: "",
                        slot3: "",
                        slot4: "",
                        slot5: "",
                        slot6: "",
                        slot7: "",
                        slot8: "",
                        slot9: ""
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error while adding saves document');
        return undefined;
    }
}

// return a list of saves associated with game server
export async function getSaves(guildId: string, token: string) {
    try {
        return await client.query(
            q.Get(q.Match(q.Index("saves_by_guildId_and_token"), guildId, token))
        );
    }
    catch (err) {
        console.log(err);
        console.log('error getting saves by guildId and token');
        return undefined;
    }
}

// we remove slots document when a game server document is removed
export async function removeSaves(guildId: string, token: string) {
    try {
        const slots: any = await getSaves(guildId, token);
        return await client.query(
            q.Delete(slots.ref)
        );
    }
    catch (err) {
        console.log(err);
        console.log('error deleting game server slots');
        return undefined;
    }
}

// update saves data
export async function updateSaves(guildId: string, token: string, saveData: ServerSaves) {
    try {
        const slots: any = await getSaves(guildId, token);
        return await client.query(
            q.Update(
                slots.ref,
                {
                    data: {
                        guildId: saveData.guildId,
                        token: saveData.token,
                        slot1: saveData.slot1,
                        slot2: saveData.slot2,
                        slot3: saveData.slot3,
                        slot4: saveData.slot4,
                        slot5: saveData.slot5,
                        slot6: saveData.slot6,
                        slot7: saveData.slot7,
                        slot8: saveData.slot8,
                        slot9: saveData.slot9,
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error updating saves');
        return undefined;
    }
}