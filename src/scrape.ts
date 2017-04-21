/// <reference types="jquery" />
import * as fs from "fs";
//import * as Nightmare from "nightmare";
import * as winston from "winston";
const Nightmare = require ("nightmare");


import md5 = require("md5");
import { create } from "webpage";

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
}

//interface IWebPageScraper extends WebPage {
//    waitFor (test: (any)=>boolean, callback: (IWebPageScraper)=>void);
//    evalJs (code: string|Function) :any;
//    resource: ResourceResponse;
//    //state: any;
//}

class WebScrapper {
    page: any;
    config: WebPageScraperConfig;
    scraperConfig: ScraperConfig;
    /**
     *
     */
    constructor(config: WebPageScraperConfig, scraperConfig?: ScraperConfig) {
        this.config = config;
        this.scraperConfig = scraperConfig;
    }

    scrape(url: string, dataScraper: () => void, complete: (any?)=>void, urlScraper: () => void, urlComplete: (any?)=>void)
    {
        let _self = this;
        winston.info("Opening " + url);
        var nightmare = Nightmare({show: true, webPreferences: {images: false}});
        var page1 =  nightmare
                    .goto(url)
                    .wait(".OrgResults")
                    .evaluate(dataScraper)
                    .then(function(data) {complete(data);})
                    .catch((err) => {console.log(`error dataScraper: ${err}`);});

         var page2 = nightmare.wait()
                    .evaluate(function() {return document.title; })
                    .then(function(a,b) {
                        console.log(`run2: a:${a} b:${b}`); 
                        
                        return a;
                    });
        
        var page = Promise.all([page1,page2]).then(() => {
            nightmare.end().then(() => {
                console.log("end"); 
                return nightmare.end().then();
            });
            return "dataaaa";
        });

                    //.end().then(() => {});
                    //page = page.end().then(); // no
//        if (dataScraper){
//            page = page.evaluate(dataScraper)
//                       .then(complete);
            //page.run(complete);
//        }
        //if (urlScraper){
        //    page.evaluate(urlScraper, urlComplete);
        //page = page.end().then();
        //page.end();
        return page;
    }
}

class UrlManager {
    visitedUrls : string[] = [];
    config: ScraperConfig;

    /**
     *
     */
    constructor(config: ScraperConfig) {
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
    private _scraperConfig : ScraperConfig;
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

        /*if (page && this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "');";
            }

            // look for more urls on this page
            var moreUrls = page.evalJs(validMoreUrls);
            if (moreUrls) {
                if (moreUrls.length) {
                    winston.info('Found ' + moreUrls.length + ' additional urls to scrape');
                    this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
                }
            }
        }*/
    }

    private extractMoreUrls() : any {
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0) return null;
                // requires jQuery
                validMoreUrls = "return $(" + this._scraperConfig.moreUrls + ").map(function() {var href = $(this).attr('href');return (href && href.indexOf('#') !== 0 && (includeOffsite || isLocalUrl(href))) ? toFullUrl(href) : undefined; }).toArray();";
                return Function (validMoreUrls);
            } else 
                return this._scraperConfig.moreUrls;
        }
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
        var waiters : Promise<any>[] = [];
        this.urls.forEach(function (url) {
            var waiter = new WebScrapper(new WebPageScraperConfig(), _self._scraperConfig)
                .scrape(url, _self._scraperConfig.scraper, (data) => _self.complete(data), 
                             _self.extractMoreUrls, (data) => _self.completeMoreUrls(data));
            waiters.push(waiter);
        });
        //Promise.all(waiters).then(values => console.log(values));
        return Promise.all(waiters.map(Utils.reflect)).then(function(results){
            console.log(`all: ${JSON.stringify(results)}`);
        })
        //console.log("launchUrls finished")
    }
}

interface IWebPageLauncher {
    //constructor(scraper: Scraper, config: ScraperConfig, depth: number, title?: string)
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
    readonly config: ScraperConfig;
    private _urlManager : UrlManager;
    private _scraperConfig : WebPageScraperConfig;

    /**
     *
     */
    constructor(config: ScraperConfig = new ScraperConfig()) {
        this.config = config;
        //this.config.nightmare = new Nightmare();
        this._urlManager = new UrlManager(config);
        this._scraperConfig = new WebPageScraperConfig();
    }

    //addLauncher(launcher: IWebPageLauncher){
    //    this.launchers.push(launcher);
    //}

    addLauncher(urls: string[], config: WebPageLauncherConfig) : void{
        var newLauncher = this.buildLauncher(urls, config);
        if (newLauncher)
            this.launchers.push(newLauncher);
    }

    addItem(item: any|any[]) {
        // check for ignoreDuplicates
        if (item)
            // apply for flattening items
            this.items = this.items.concat.apply(item);
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
        fs.writeFile(this._scraperConfig.outFile, JSON.stringify(this.items));        
    }

}

export class ScraperConfig {
    debugResponse: boolean = false;
    debugRequest: boolean = false;
    debug: boolean = false;
    noConflict: boolean;
    ready: "return _pjs.ready;"; // function returns boolean
    //scrapable: () => boolean; // function returns boolean
    loadScript: string[];
    //preScrape: boolean;
    depth: number = 0;
    //nightmare: Nightmare;

    //
    moreUrls: (string|Function) = "";
    maxDepth: number = 1;
    newHashNewPage: boolean = true;
    scraper: () => void = function () {        
        var c:any[] = [];
        $(".OrgResult").each(function (i, v) {
            var x:any = {};
            x.contact = {};
            x.name = $(".Name", v).text();
            x.contact.phone = $("a:contains('-')", v).text();
            x.contact.email = $("a:contains('@')", v).text();
            x.contact.website = $("a:contains('http://')", v).text();
            x.contact.address = $(".Address", v).text().trim().replace("Address", "");
            c.push(x);
        });
        return c;
    };
    allowRepeatedUrls: boolean = false;
    ignoreDuplicates: boolean = true; // ignore data duplicates
    url: string = "http://www.diocesefwsb.org/Find-a-Parish?Type=Church&Alphabet=C";
}

class WebPageScraperConfig {
    delayBetweenRuns: number = 0;
    timeoutInterval: number = 100;
    timeoutLimit: number = 3000;
    format: string = "json";
    logFile: string = "output.txt";
    outFile: string = "output.json";
}


