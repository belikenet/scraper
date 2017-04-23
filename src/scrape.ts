/// <reference types="jquery" />
import * as fs from "fs";
import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
const Nightmare = require ("nightmare");

import * as csv from 'd3-dsv';
import * as S from "string";

import md5 = require("md5");

module Utils {
    export function isFunction (f) : boolean {
        return typeof f === 'function';
    }

    export function isObject (o) : boolean{
        return typeof o === 'object';
    }

    export function funcify(f) {
        return this.isFunction(f) ? f : function() { return f; };
    }

    export function isArray(a) : boolean {
        return Array.isArray(a);
    }

    export function arrify<T>(a) : T[] {
        return this.isArray(a) ? a : a ? [a] : [];
    }

    export function getKeys(o) : string[] {
        var keys = [];
        for (var key in o) keys.push(key);
        return keys;
    }

    export function extend(obj) : any {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
            for (var prop in source) {
                try {
                    //recursively merge object properties
                    if ( source[prop].constructor==Object ) {
                        obj[prop] =this.extend(obj[prop], source[prop]);
                    } else {
                        if (source[prop] !== void 0) obj[prop] = source[prop];
                    }
                } catch(e) {
                    // Property in destination object not set; create it and set its value.
                    obj[prop] = source[prop];
                }
            }
        });
    }

    export function md5HashFunction (item: any){
        return md5(JSON.stringify(item));
    }

    export function idHashFunction (item: any) {
        return ('id' in item) ? item.id : md5HashFunction(item);
    }

    export function reflect(promise){
        return promise.then(function(v){ 
            return {data:v, status: "resolved" }
        },
                            function(e){ return {data:e, status: "rejected" }});
    }

    export function flatten (object) {
        return Object.assign( {}, ...function _flatten( objectBit, path = '' ) {  //spread the result into our return object
            return [].concat(                                                       //concat everything into one level
            ...Object.keys( objectBit ).map(                                      //iterate over object
                key => typeof objectBit[ key ] === 'object' && objectBit [ key ] !== null ?                       //check if there is a nested object
                _flatten( objectBit[ key ], `${ path.length ? path + "." : path }${ key }` ) :              //call itself if there is
                ( { [ `${ path.length ? path + "." : path }${ key }` ]: objectBit[ key ] } )                //append object with it’s path as key
            )
            )
        }( object ) );
    };
}

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
        winston.info("Opening " + url);

        var nightmare = Nightmare({show: false, webPreferences: {images: false}});

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
            if (data != null)
                complete(data);
             
             if (urlScraper != null)
                return nightmare.evaluate(urlScraper);
            return new Promise((resolve,reject) => resolve(null));
        }).then((data) => {
            if (data != null)
                urlComplete(data);

            return nightmare.end();
        }).then(() => {
            winston.info("scraper end");
        }).catch((error) => {
            winston.error("ERROR " + error);
        });
        
        return then;
    }
}

class UrlManager {
    visitedUrls : string[] = [];
    config: Settings;

    /**
     *
     */
    constructor(config: Settings) {
        this.config = config;
    }

    tryAddUrl (url: string) : boolean{
        var validUrl = this.config.newHashNewPage ? url.split('#')[0] : url;
        var isValidUrl = (!(this.config.allowRepeatedUrls && url in this.visitedUrls))
        if (isValidUrl)
            this.visitedUrls.push(url);
        return isValidUrl;
    }

    addUrls (urls: string[]) : string[]{
        var _self = this;
        return urls.filter(function(u) { return _self.tryAddUrl(u); });
    }
}

class WebPageParallelLauncher {

}

class WebPageSerialLauncher implements IWebPageLauncher {
    private _scraper : Scraper;
    private _scraperConfig : SettingsWeb;
    readonly launcherConfig : WebPageLauncherConfig;
    readonly urls: string[];

    constructor(urls: string[], scraper: Scraper, launcherConfig: WebPageLauncherConfig) {
        this._scraper = scraper;
        this._scraperConfig = scraper.config;
        this.launcherConfig = launcherConfig;
        this.urls = urls;
    }

    complete(scraperResult: any){
        console.log("data complete");
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
                    winston.info('Found ' + moreUrls.length + ' additional urls to scrape');
                    this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
                }
            }
    }

    launchUrls() {
        var _self = this;
        var chain = Promise.resolve();
        this.urls.slice(0,2).forEach((url)=> {
            chain = chain.then(() => {
                return new WebScrapper(new Settings(), _self._scraperConfig)
                .scrape(url, _self._scraperConfig.scraper, (data) => _self.complete(data), 
                             _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data));
            })
        })

        chain.then(() => {
            winston.info("ending lauchUrls loop");
        }).catch((error) => {
            winston.error("ERROR: " + error);
        });

        return chain;
    }
}

interface IWebPageLauncher {
    launchUrls();
}

class WebPageLauncherConfig {
    readonly depth: number;
    readonly title: string;

    constructor(depth?: number, title?: string) {
        this.depth = depth || 0;
        this.title = title || this.defaultTitle(this.depth);
    }

    private defaultTitle (depth: number) : string {
        return " depth " + (depth) + " _";
    }

    buildChild(title?: string) : WebPageLauncherConfig {
        var nextDepth = this.depth + 1;
        var nextTitle = title || this.title + this.defaultTitle(nextDepth);
        return new WebPageLauncherConfig(nextDepth, nextTitle);
    }
}

export class Scraper {
    private launchers: IWebPageLauncher[] = [];
    private items: any[] = [];
    readonly config: SettingsWeb;
    private _urlManager : UrlManager;
    private _scraperConfig : Settings;

    /**
     *
     */
    constructor(config: SettingsWeb = new SettingsWeb()) {
        this.config = config;
        this._scraperConfig = new Settings();
        this._urlManager = new UrlManager(this._scraperConfig);
    }

    addLauncher(urls: string[], config: WebPageLauncherConfig) : void{
        var newLauncher = this.buildLauncher(urls, config);
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

    private validateDataItem(source: any) : any {
        var merged = Object.assign({}, this.config.dataTemplate, source);
        merged.contact = Object.assign({}, this.config.dataTemplate.contact, source.contact)
        if (S(merged.name).isEmpty()) merged.notes += "name not found. ";
        else merged.name = S(merged.name).collapseWhitespace().toString();
        if (S(merged.url).isEmpty()) merged.notes += "url not found. ";
        if (S(merged._type).isEmpty()) merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty()) merged.notes += "country not found";
        merged.contact.country = S(merged.contact.country).collapseWhitespace().toString();
        merged.contact.phone = S(merged.contact.phone).collapseWhitespace().toString();
        merged.contact.fax = S(merged.contact.fax).collapseWhitespace().toString();
        merged.contact.email = S(merged.contact.email).collapseWhitespace().toString();
        merged.contact.website = S(merged.contact.website).collapseWhitespace().toString();
        merged.contact.address = S(merged.contact.address)
                                    .lines()
                                    .map((l) => S(l).collapseWhitespace())
                                    .filter(i => !S(i).isEmpty())
                                    .join(", ");

        return merged;
    }

    private buildLauncher(urls: string[], launcherConfig: WebPageLauncherConfig) : IWebPageLauncher {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0){
            return new WebPageSerialLauncher(validUrls, this, launcherConfig)
        }
        return null;            
    }

    async init () {
        var firstLauncher = this.buildLauncher(Utils.arrify(this.config.url) as string[], new WebPageLauncherConfig());
        if (!firstLauncher)
            return;

        this.launchers.push(firstLauncher);
        var launcher : IWebPageLauncher;
        while (launcher = this.launchers.shift()){
            await launcher.launchUrls();
        }

        console.log("writing");
        if (this._scraperConfig.format == "json")
            fs.writeFile(this._scraperConfig.outFile, JSON.stringify(this.items));
        if (this._scraperConfig.format == "csv")
            fs.writeFile(this._scraperConfig.outFile, csv.csvFormat(this.items.map(i => Utils.flatten(i)).filter(i => i)));
    }

}
