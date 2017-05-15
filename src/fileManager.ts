import * as fs from "fs";
import * as path from "path";
import * as csv from 'd3-dsv';
import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { Inject } from 'di-typescript';
import { Utils } from "./util";
import * as Enumerable from "linq";

@Inject
export class FileManager {
    private settings: Settings;
    private settingsWeb: SettingsWeb;

    constructor(settingsWeb: SettingsWeb, settings: Settings){
        this.settingsWeb = settingsWeb;
        this.settings = settings;
    }

    exportSettings (profileFolder : string = this.settingsWeb.profileFolder) {
        if (!fs.existsSync(profileFolder)){
            fs.mkdirSync(profileFolder);
        }

        this.copyFile (".//src//settings.ts",path.resolve(profileFolder, "settings.ts"));
        this.copyFile (".//src//settings.web.ts",path.resolve(profileFolder, "settings.web.ts"));
    }

    exportOutput(items) {
        winston.verbose("writing items");
        // exportSettings checks & create profile folder
        this.exportSettings();
        var outputFile = path.resolve (this.settingsWeb.profileFolder, this.settings.outFile);
        if (this.settings.format == "json")
            fs.writeFileSync(outputFile, JSON.stringify(items));
        if (this.settings.format == "csv")
            fs.writeFileSync(outputFile, csv.csvFormat(items.map(i => Utils.flatten(i)).filter(i => i)));
    }

    exportOutputJson(data: any, filename: string){
        var outputFile = path.resolve (this.settingsWeb.profileFolder, filename);
        fs.writeFileSync(outputFile, JSON.stringify(data));
    }

    processInputUrls (urls: any) : string[] {
        // urls is string
        if (typeof urls === "string")
        {
            // single url
            if (urls.startsWith("http://")||urls.startsWith("https://"))
                return Utils.arrify(urls) as string[];
            // file
            else {
                var ext = path.extname(urls);
                if (ext==".json" || ext == ".csv")
                {
                    //var inputFile = path.resolve (this.defaultOutputFolder(), urls);
                    var inputFile = path.resolve (this.settingsWeb.profileFolder, urls);
                    //TODO: check if file exists
                    var content = fs.readFileSync(inputFile, "UTF8");
                    urls = ext == ".json" ? JSON.parse(content) : csv.csvParse(content);
                }
            }
        }

        if (Array.isArray(urls)){
            if (urls.length > 0)
                if (typeof urls[0] === "string")
                    return urls;
                else
                    return Enumerable.from(urls as any[]).select((x) => x.url).toArray();
        }

        return null;
    }


    private importJson(filename: string){
        var inputFile = path.resolve (this.settingsWeb.profileFolder, filename);
        var content = fs.readFileSync(inputFile, "UTF8");
        return JSON.parse(content);
    }

    private copyFile(sourceFile: string, targetFile: string){
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));
    }
}
