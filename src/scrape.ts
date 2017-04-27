import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { Utils, UrlManager } from "./util";

const Nightmare = require ("nightmare");

import * as csv from 'd3-dsv';
import * as S from "string";

class WebScrapper {
    page: any;
    config: Settings;
    scraperConfig: SettingsWeb;
    /**
     *
     */
    constructor(config: Settings, scraperConfig?: SettingsWeb) {
        this.config = config;
        this.scraperConfig = scraperConfig;
    }


    scrape (url: string, dataScraper: Function, complete: (any?)=>void, urlScraper: () => void, urlComplete: (any?)=>void)
    {
        let _self = this;
        var thens : Promise<any>[] = [];
        winston.debug("Opening " + url);

        var nightmare = Nightmare({show: false, webPreferences: {images: false}});

        var item : any = null;
        function createOrUpdateItemNotes(notes: string) {
            if (item != null)
                if (item.notes === undefined) item.notes = notes;
                else item.notes += notes;
            else
                item = {url: url, notes: notes};
        }

        var then = nightmare.goto(url)
        .then (() => {
            if (_self.scraperConfig.injectJQuery)
            {
            return nightmare.inject("js", "client\\jquery.js")
                    .evaluate(Function("window._pjs$ = jQuery.noConflict(true);"))
                    .inject("js", "client\\pjscrape_client.js")
                    .wait(Function("return window._pjs.ready;"));
            }
            return new Promise((resolve, reject) => resolve(false));
        }).then(() => {
            if (!S(_self.scraperConfig.waitFor).isEmpty())
                return nightmare.wait(_self.scraperConfig.waitFor);

            return new Promise((resolve,reject) => resolve(false));
        }).then(() => {
            if (dataScraper != null)
                return nightmare.evaluate(dataScraper);

            return new Promise((resolve,reject) => resolve(null));                        
        }).then(function(data) {
            item = data;
            //if (data != null)
            //    complete(data);
             
            if (urlScraper != null)
                return nightmare.evaluate(urlScraper);
            return new Promise((resolve,reject) => resolve(null));
        }).then((data) => {
            if (data != null)
            {
                urlComplete(data);
                createOrUpdateItemNotes("INDEX page. ")
            }

            return nightmare.end();
        }).then(() => {
            winston.debug("scraper end");
        }).catch((error) => {
            winston.error(error);
            createOrUpdateItemNotes(`${error} `);
        }).then(() => {
            if (item != null)
                complete(item);
        }).catch((error) => {
            winston.error(`${error}`);
        });
        
        return then;
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
        winston.debug("data complete");
        this._scraper.addItem(scraperResult);
    }

    private extractMoreUrls() : any {
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0) return null;
                validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "')";
                return Function (validMoreUrls);
            } else 
                return this._scraperConfig.moreUrls;
        }
        return null;
    }

    private completeMoreUrls(moreUrls: string[]) {
            if (moreUrls) {
                if (moreUrls.length) {
                    winston.debug('Found ' + moreUrls.length + ' additional urls to scrape');
                    this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
                }
            }
    }

    launchUrls() {
        var _self = this;
        var chain = Promise.resolve();
        this.urls.forEach((url)=> {
            chain = chain.then(() => {
                return new WebScrapper(new Settings(), _self._scraperConfig)
                .scrape(url, _self._scraperConfig.scraper, (data) => _self.completeScraper(data), 
                             _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data));
            })
        })

        chain.then(() => {
            winston.debug("ending lauchUrls loop");
        }).catch((error) => {
            winston.error("ERROR: " + error);
        });

        return chain;
    }
}

interface IWebPageLauncher {
    launchUrls();
}

class WebPageLauncherSettings {
    readonly depth: number;
    readonly title: string;

    constructor(depth?: number, title?: string) {
        this.depth = depth || 0;
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

    /**
     *
     */
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
            item = this.validateDataItem(item);
            this.items = this.items.concat(item);
            // apply for flattening items
            this.items = [].concat(this.items);
        }
    }

    private collapse(text:string) : string {
        return S(text.replace(new RegExp(",", 'g'), " ")).collapseWhitespace().toString();
    }

    private validateDataItem(source: any) : any {
        var merged = Object.assign({}, this.settingsWeb.dataTemplate, source);
        merged.contact = Object.assign({}, this.settingsWeb.dataTemplate.contact, source.contact)
        if (S(merged.name).isEmpty()) merged.notes += "name not found. ";
        else merged.name = this.collapse(merged.name);
        if (S(merged.url).isEmpty()) merged.notes += "url not found. ";
        if (S(merged._type).isEmpty()) merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty()) merged.notes += "country not found";
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

    private buildLauncher(urls: string[], launcherConfig: WebPageLauncherSettings) : IWebPageLauncher {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0){
            return new WebPageLauncher(validUrls, this, launcherConfig)
        }
        return null;            
    }

    async init () {
        var firstLauncher = this.buildLauncher(Utils.arrify(this.settingsWeb.url) as string[], new WebPageLauncherSettings());
        if (!firstLauncher)
            return;

        this.launchers.push(firstLauncher);
        var launcher : IWebPageLauncher;
        while (launcher = this.launchers.shift()){
            await launcher.launchUrls();
        }

        winston.debug("writing");
        // exportSettings checks & create profile folder
        this.exportSettings();
        var outputFile = path.resolve (this.defaultOutputFolder(), this.settings.outFile);
        if (this.settings.format == "json")
            fs.writeFile(outputFile, JSON.stringify(this.items));
        if (this.settings.format == "csv")
            fs.writeFile(outputFile, csv.csvFormat(this.items.map(i => Utils.flatten(i)).filter(i => i)));
    }

    private defaultOutputFolder() : string {
        
        var profileFolder = new URL(this.settingsWeb.url).hostname.replace("www.","");
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

}
