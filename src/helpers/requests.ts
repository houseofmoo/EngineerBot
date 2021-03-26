import axios from 'axios';
import qs from 'query-string'
import urls from '../data/api.urls.json';

// response interceptors -> prevents error out on bad request
axios.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response !== undefined) {
        return error.response;
    }
    
    console.log('error did not have response');
    return error;
});

export async function login(visitSecret: string, serverToken: string | null): Promise<any> {
    //let form = `userToken=${serverToken}&visitSecret=${visitSecret}&reconnected=false`;
    try {
        return await axios.post(urls.gameServer.login, qs.stringify({
            visitSecret,
            userToken: serverToken,
            reconnected: "false"
        }));
    }
    catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function startServer(visitSecret: string, region: string, slot: string, version: string): Promise<void> {
    await axios.post(urls.gameServer.start, qs.stringify({
        visitSecret: visitSecret,
        region: region,
        save: slot,
        version: version
    })).then((response) => {
        console.log("response code: " + response.status + ' ' + response.statusText);
    })
}

export async function stopServer(visitSecret: string, launchId: string): Promise<void> {
    //let form = `visitSecret=${visitSecret}&launchId=${launchId}`;
    await axios.post(urls.gameServer.stop, qs.stringify({
        visitSecret: visitSecret,
        launchId: launchId,
    })).then((response) => {
        console.log("response code: " + response.status + ' ' + response.statusText);
    })
}

export async function enableMod(visitSecret: string, modId: string, enabled: boolean): Promise<void> {
    //let form = `visitSecret=${visitSecret}&modId=${modId}&enabled=${enabled}`;
    await axios.post(urls.gameServer.modToggle, qs.stringify({
        visitSecret: visitSecret,
        modId: modId,
        enabled: enabled
    })).then((response) => {
        console.log("response code: " + response.status + ' ' + response.statusText);
    })
}

export async function promote(visitSecret: string, launchId: string | undefined, username: string): Promise<void> {
    // dont ask me, forms are friggin weird
    //let form = `visitSecret=${visitSecret}&launchId=${launchId}&input=%2Fpromote%20${username}`;
    await axios.post(urls.gameServer.console, qs.stringify({
        visitSecret: visitSecret,
        launchId: launchId,
        input: `/promote ${username}`
    })).then((response) => {
        console.log("response code: " + response.status + ' ' + response.statusText);
    })
}

export async function chat(visitSecret: string, launchId: string, username: string, msg: string): Promise<void> {
    //let fullMsg = `${username} ${msg}`;
    //fullMsg.replace(' ', '%20'); // convert spaces to form spaces...? something like that, again forms are weird
    //let form = `visitSecret=${visitSecret}&launchId=${launchId}&input=${fullMsg}`;
    console.log(qs.stringify({
        visitSecret: visitSecret,
        launchId: launchId,
        input: `${username}: ${msg}`
    }))
    await axios.post(urls.gameServer.console, qs.stringify({
        visitSecret: visitSecret,
        launchId: launchId,
        input: `${username} ${msg}`
    })).then((response) => {
        console.log("response code: " + response.status + ' ' + response.statusText);
    })
}
