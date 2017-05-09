import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { Utils, UrlManager } from "./util";
import * as Enumerable from "linq";
import { web, Repository } from "./repository";

const Nightmare = require ("nightmare");
const vo = require("vo");

import * as csv from 'd3-dsv';
import * as S from "string";

class WebScrapper {
    page: any;
    config: Settings;
    scraperConfig: SettingsWeb;

    constructor(config: Settings, scraperConfig?: SettingsWeb) {
        this.config = config;
        this.scraperConfig = scraperConfig;
    }


    *scrape (urls: string[], dataScraper: Function, complete: (any?)=>void, urlScraper: (any) => void, urlComplete: (any?)=>void) : any
    {
        let _self = this;

        var nightmare = Nightmare({show: true, pollInterval: 800, webPreferences: {images: false}});
        var scrapers:any[] = [];
        scrapers = urls.map((url) => workflow(url));

        for (var i in urls){
            yield workflow(urls[i]);
        }

        yield nightmare.end();

        function *workflow(url) {
            function createOrUpdateItemNotes(notes: string) {
                if (item != null)
                    if (item.notes === undefined) item.notes = notes;
                    else item.notes += notes;
                else
                    item = {url: url, notes: notes};
            }
            var item : any = null;

            function * subWorkflow () {

                winston.silly("Opening " + url);

                yield nightmare.goto(url);
                if (_self.scraperConfig.injectJQuery)
                {
                    yield nightmare.inject("js", "client\\jquery.js")
                        .evaluate(Function("window._pjs$ = jQuery.noConflict(true);"))
                        .inject("js", "client\\pjscrape_client.js")
                        .wait(Function("return window._pjs.ready;"));
                }

                //if (!S(_self.scraperConfig.waitFor).isEmpty())
                //    yield nightmare.wait(_self.scraperConfig.waitFor);

                if (dataScraper != null)
                    item = yield nightmare.evaluate(dataScraper);
                    
                if (urlScraper != null){
                    var data = yield vo(urlScraper(nightmare));

                    urlComplete(data);
                    createOrUpdateItemNotes("INDEX page. ")
                }
            }

            yield vo(subWorkflow)
                .catch((error) => {
                    winston.error(error);
                    createOrUpdateItemNotes(`${error} `);
                })
                .then (() => {
                    if (item != null)
                        complete(item);
                });
        }    
    }
}


class WebPageLauncher implements IWebPageLauncher {
    private _scraper : Scraper;
    private _scraperConfig : SettingsWeb;
    readonly launcherConfig : WebPageLauncherSettings;
    readonly urls: string[];

    constructor(urls: string[], scraper: Scraper, launcherConfig: WebPageLauncherSettings) {
        this._scraper = scraper;
        this._scraperConfig = scraper.settingsWeb;
        this.launcherConfig = launcherConfig;
        this.urls = urls;
    }

    private completeScraper(scraperResult: any){
        winston.verbose("data complete");
        this._scraper.addItem(scraperResult);
    }

    private extractMoreUrls() : any {
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth <= this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0) return null;
                //validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "')";
                validMoreUrls = `var ___x= []; document.querySelectorAll("${this._scraperConfig.moreUrls}").forEach((e) => ___x.push(e.href)); return ___x;`;
                return Function (validMoreUrls);
            } else 
                return this._scraperConfig.moreUrls(this.launcherConfig.depth, this._scraperConfig.url);
        }
        return null;
    }

    private completeMoreUrls(moreUrls: any[]) {
        if (moreUrls && Array.isArray(moreUrls) && moreUrls.length > 0) {

            winston.verbose('Found ' + moreUrls.length + ' additional urls to scrape');
            if (this._scraperConfig.exportUrls)
                this.exportMoreUrls(moreUrls);
            this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());

            var records = moreUrls.map((u) => {
                var w:web = null;
                if (typeof u === "string")
                    w = new web(u);
                else if (u["url"] !== undefined) {
                    w = new web (u["url"]);
                    delete u["url"];
                    w.notes = u;
                }
                if (w!=null){
                    w.depth = this.launcherConfig.depth + 1;
                    w.isLeaf = w.depth == this._scraperConfig.maxDepth;
                    return w;
                }
                winston.error("Url not recognized: " + u);
            })

            //new Repository().insert (records).then(() => {});
        }
    }

    private exportMoreUrls(moreUrls: any) {
        this._scraper.exportOutputJson(moreUrls, "urls.json");
    }

    launchUrls() {
        var _self = this;

        return vo(Utils.binarify(this.urls, _self._scraperConfig.instancesCount)
                .map((bin) => new WebScrapper(new Settings(), _self._scraperConfig)
                             .scrape(bin, _self._scraperConfig.scraper, (data) => _self.completeScraper(data), 
                             _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data)))
        ).catch((error) => {
            winston.error("ERROR: " + error);
        }).then(() => {
            winston.verbose("ending launch Electron instances");
        });
    }
}

interface IWebPageLauncher {
    launchUrls();
}

class WebPageLauncherSettings {
    readonly depth: number;
    readonly title: string;

    constructor(depth?: number, title?: string) {
        this.depth = depth || 1;
        this.title = title || this.defaultTitle(this.depth);
    }

    private defaultTitle (depth: number) : string {
        return " depth " + (depth) + " _";
    }

    buildChild(title?: string) : WebPageLauncherSettings {
        var nextDepth = this.depth + 1;
        var nextTitle = title || this.title + this.defaultTitle(nextDepth);
        return new WebPageLauncherSettings(nextDepth, nextTitle);
    }
}

export class Scraper {
    private launchers: IWebPageLauncher[] = [];
    private items: any[] = [];
    readonly settingsWeb: SettingsWeb;
    private _urlManager : UrlManager;
    private settings : Settings;

    constructor(settingsWeb: SettingsWeb = new SettingsWeb()) {
        this.settingsWeb = settingsWeb;
        this.settings = new Settings();
        this._urlManager = new UrlManager(this.settings);
    }

    addLauncher(urls: string[], launcherSettings: WebPageLauncherSettings) : void{
        var newLauncher = this.buildLauncher(urls, launcherSettings);
        if (newLauncher)
            this.launchers.push(newLauncher);
    }

    addItem(item: any|any[]) {
        var self = this;
        // check for ignoreDuplicates
        if (item)
        {
            var items = Utils.isArray(item) ? item : [item];
            items = items.map((x) => this.validateDataItem(x));
            this.items = this.items.concat(items);
            // apply for flattening items
            this.items = [].concat(this.items);
        }
    }

    private collapse(text:string) : string {
        return S(text).collapseWhitespace().toString();
    }

    private validateDataItem(source: any) : any {
        var merged = Object.assign({}, this.settingsWeb.dataTemplate, source);
        merged.contact = Object.assign({}, this.settingsWeb.dataTemplate.contact, source.contact)
        if (S(merged.name).isEmpty()) merged.notes += "name not found. ";
        else merged.name = this.collapse(merged.name);
        if (S(merged.url).isEmpty()) merged.notes += "url not found. ";
        if (S(merged._type).isEmpty()) merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty()) merged.notes += "country not found. ";
        merged.contact.country = this.collapse(merged.contact.country);
        merged.contact.phone = this.collapse(merged.contact.phone);
        merged.contact.fax = this.collapse(merged.contact.fax);
        merged.contact.email = this.collapse(merged.contact.email);
        merged.contact.website = this.collapse(merged.contact.website);
        merged.contact.address = S(merged.contact.address)
                                    .lines()
                                    .map((l) => this.collapse(l))
                                    .filter(i => !S(i).isEmpty())
                                    .join(", ");

        return merged;
    }

    private setLogger () {
        if (process.env.DEBUG && !this.settings.logLevel) 
            this.settings.logLevel = "verbose";
        if (this.settings.logLevel){
            //winston.level = this.settings.logLevel
            winston.transports[0].level = this.settings.logLevel;
            winston.transports[0].colorize = true;
            winston.transports[0].prettyPrint = true;
        }
    }

    private buildLauncher(urls: string[], launcherConfig: WebPageLauncherSettings) : IWebPageLauncher {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0){
            return new WebPageLauncher(validUrls, this, launcherConfig)
        }
        return null;            
    }

    async init () {
        this.setLogger();
        var urls = this.processInputUrls(this.settingsWeb.url);
        var firstLauncher = this.buildLauncher(urls, new WebPageLauncherSettings());
        if (!firstLauncher)
            return;

        this.launchers.push(firstLauncher);
        var launcher : IWebPageLauncher;
        while (launcher = this.launchers.shift()){
            await launcher.launchUrls();
        }

        this.exportOutput();
    }

    private exportOutput() {
        winston.verbose("writing items");
        // exportSettings checks & create profile folder
        this.exportSettings();
        var outputFile = path.resolve (this.defaultOutputFolder(), this.settings.outFile);
        if (this.settings.format == "json")
            fs.writeFile(outputFile, JSON.stringify(this.items));
        if (this.settings.format == "csv")
            fs.writeFile(outputFile, csv.csvFormat(this.items.map(i => Utils.flatten(i)).filter(i => i)));
    }

    public exportOutputJson(data: any, filename: string){
        var outputFile = path.resolve (this.defaultOutputFolder(), filename);
        fs.writeFile(outputFile, JSON.stringify(data));
    }

    private importJson(filename: string){
        var inputFile = path.resolve (this.defaultOutputFolder(), filename);
        var content = fs.readFileSync(inputFile, "UTF8");
        return JSON.parse(content);
    }

    private defaultOutputFolder() : string {        
        var profileFolder = new URL(Array.isArray(this.settingsWeb.url) ? this.settingsWeb.url[0] : this.settingsWeb.url)
            .hostname.replace("www.","");
        return  path.resolve(this.settings.outFolder, profileFolder)
    }

    private copyFile(sourceFile: string, targetFile: string){
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));
    }

    exportSettings (profileFolder : string = this.defaultOutputFolder()) {
        if (!fs.existsSync(profileFolder)){
            fs.mkdirSync(profileFolder);
        }

        this.copyFile (".//src//settings.ts",path.resolve(profileFolder, "settings.ts"));
        this.copyFile (".//src//settings.web.ts",path.resolve(profileFolder, "settings.web.ts"));
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
                    //TODO: check if file exists
                    var content = fs.readFileSync(urls, "UTF8");
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

}
