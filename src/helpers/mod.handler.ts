import axios from 'axios';
import fs from 'fs';

import urls from '../data/api.urls.json';
import config from '../data/config.json';

export class ModHandler {
    async downloadMod(args: string[]) {

        // real docs: https://wiki.factorio.com/Mod_portal_API
        // user made docs: https://artentus.github.io/FactorioApiDoc/
        // project using api: https://github.com/OpenFactorioServerManager/factorio-server-manager/

        // user must provide a valid slot1
        // user must provide a valid mod (case sensitive)
        // search for mod (may be possible, look at docs closer)
        // if we cannot find it, inform user and we're done
        // if found, collect the download url

        // get auth token via username and pw
        // use download url, user name and auth token to download the file

        // next upload the mod to server
        // add the mod as part of that slots associated mods
        // store the mod name, file name, version to the appropriate slot
        // we want the name incase we need to redownload the file, and the version for a "mod-update" command

        // we probably want to add a "mod-update" command to go through all mods and look for new versions

        // parse args
        //let slotName = args[0].trim().toLowerCase();
        let modName = args[1].trim();

        // get auth token
        let form = `username=${config.factorioModsLogin.username}&password=${config.factorioModsLogin.password}`
        let token = await axios.post(urls.mod.authUrl, form);

        // get download url
        let response = await axios.get(urls.mod.apiUrl + modName);

        // build download url
        let subUrl = response.data.releases[0].download_url;
        const downloadUrl = `${urls.mod.websiteUrl}${subUrl}?username=${config.factorioModsLogin.username}&token=${token.data[0]}`;
        
        // init file stream
        const filename = response.data.releases[0].file_name
        const file = fs.createWriteStream(filename);

        // download file to file stream
        response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
            
        });

        // pipe the data to file stream
        response.data.pipe(file);

    };

    // async downloadFile(fileUrl, outputPath) {
    //     const writer = fs.createWriteStream(outputPath);

    //     return await axios({
    //         url: fileUrl,
    //         method: 'GET',
    //         responseType: 'stream'
    //     }).then(response => {
    //         return new Promise((resolve, reject) => {
    //             response.data.pipe(writer);
    //             let error = null;

    //             writer.on('error', err => {
    //                 error = err;
    //                 writer.close();
    //                 reject(err);
    //             });

    //             writer.on('close', () => {
    //                 if (!error) {
    //                     resolve(true);
    //                 }
    //             });
    //         });
    //     });
    // }
}