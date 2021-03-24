import faunadb from 'faunadb';
import config from '../data/config.json';
import { Slot, GameServerSlots } from '../models/data.types';

const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

// return a list of slots associated with a game server
export async function getSlots(guildId: string, token: string) {
    try {
        const resp: any =  await client.query(
            q.Get(q.Match(q.Index("slots_by_guildId_and_token"), guildId, token))
        );

        if (resp !== undefined) {
            const slotList: Slot[] = [];
            for (const slot of resp.data.slots) {
                slotList.push({
                    name: slot.name,
                    slotId: slot.slotId,
                    utilized: slot.utilized,
                    mods: slot.mods
                })
            }

            const slots: GameServerSlots = {
                guildId: resp.data.guildId,
                token: resp.data.token,
                slots: slotList
            }

            return slots;
        }

        return undefined;
    }
    catch (err) {
        console.log(err);
        console.log('error getting game slots by guildId and token');
        return undefined;
    }
}

// we remove slots document when a game server document is removed
export async function removeSlots(guildId: string, token: string) {
    try {
        const slots: any = await getSlots(guildId, token);
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

// we add slots document when a new game server document
export async function addSlots(guildId: string, token: string) {
    const slots = [
        {
            "name": "empty",
            "slotId": "slot1",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot2",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot3",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot4",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot5",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot6",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot7",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot8",
            "utilized": false,
            "mods": []
        },
        {
            "name": "empty",
            "slotId": "slot9",
            "utilized": false,
            "mods": []
        },
    ]

    try {
        return await client.query(
            q.Create(
                q.Collection("slots"),
                {
                    data: {
                        guildId: guildId,
                        token: token,
                        slots: slots
                    }
                }
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error adding new slots');
        return undefined;
    }
}

// update a single slot with new data
export async function updateSlot(guildId: string, token: string, slotData: Slot) {
    try {
        const slots: any = await getSlots(guildId, token);
        const slot: any = slots.data.slots.find((s: any) => s.slotId === slotData.slotId);
        slot.name = slotData.name;
        slot.utilized = slotData.utilized;
        slot.mods = slotData.mods;

        return await client.query(
            q.Update(
                slots.ref,
                {
                    data: {
                        slots: slots.data.slots
                    }
                }
            )
        )
    }
    catch (err) {
        console.log(err);
        console.log('error resetting slot');
        return undefined;
    }
}