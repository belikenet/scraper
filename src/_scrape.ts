import * as fs from "fs";
import * as Nightmare from "nightmare";
import * as winston from "winston";


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
        //this.page = create() as IWebPageScraper;
        //this.page.onConsoleMessage = function (msg, line, id) {
            //if (msg.indexOf('___') === 0) return;
            //id = id || 'injected code';
            //if (line) msg += ' (' + id + ' line ' + line + ')';
            //winston.info('CLIENT: ' + msg);
        //}

        //this.page.onAlert = function(msg) { winston.warn('CLIENT: ' + msg); }

        var _self = this;
        _self.page.evalJs = function (code: string|Function){
            if (typeof code == "string")
                return _self.page.evaluate(new Function(code));
            else
                return _self.page.evaluate(code as Function);
        }

        _self.page.waitFor = function(test, callback) {
            // check for short-circuit
            if (!_self.page.evaluate(test)) {
                // poll until timeout or success
                var elapsed = 0,
                    timeoutId = window.setInterval(function() {
                        elapsed += _self.config.timeoutInterval;
                        if (_self.page.evaluate(test) || elapsed > _self.config.timeoutLimit) {
                            if (elapsed > _self.config.timeoutLimit) {
                                winston.warn('Timeout after ' + ~~(elapsed / 1000) + ' seconds');
                            }
                            window.clearInterval(timeoutId);
                            //callback(this.page);
                        } 
                    }, _self.config.timeoutInterval);
            }
            callback(_self.page);
        };

        _self.page.onResourceRequested = function (req) {
            if (_self.scraperConfig.debugRequest || _self.scraperConfig.debug) {
                winston.info('requested: ' + JSON.stringify(req, undefined, 4));
            }
        };
    }

    private attachOnResourceReceived (url: string) {
        var _self = this;
        _self.page.onResourceReceived = function(res) {
            if (_self.scraperConfig.debugResponse || this.scraperConfig.debug) {
                winston.info('received: ' + JSON.stringify(res, undefined, 4));
            }
            if (res.stage == 'end' && res.url == url) {
                _self.page.resource = res;
            }
        };
    }

    private injectCommonScripts(state){
        // load jQuery
        this.page.injectJs('client/jquery.js');
        //this.page.injectJsCode(function() {
        //    window._pjs$ = jQuery.noConflict(true);
        //});
        this.page.evalJs("")
        // load pjscrape client-side code
        this.page.injectJs('client/pjscrape_client.js');
        // attach persistent state
        //this.page.evalJs("_pjs.state = " + JSON.stringify(state) + ";");
        // reset the global jQuery vars
        //if (!this.scraperConfig.noConflict) {
        //    this.page.evaluate(function() {
        //        window.$ = window.jQuery = window._pjs$;
        //    });
        //}
        this.page.evalJs("window.$ = window.jQuery = window._pjs$;")
    }

    private injectConfigLoadScripts(loadScripts: string[]){
        if (loadScripts) {
            loadScripts.forEach(function(script) {
                this.page.injectJs(script);
            });
        }
    }

    private isValidStatus(url: string, pageResource: ResourceResponse) : boolean {
        // check for load errors
        if (status != "success") {
            winston.error('Page did not load (status=' + status + '): ' + url);
            return false;
        }
        // look for 4xx or 5xx status codes
        var statusCodeStart = pageResource && String(pageResource.status).charAt(0);
        if (statusCodeStart == '4' || statusCodeStart == '5') {
            if (pageResource.status == 404) {
                winston.error('Page not found: ' + url);
            } else {
                winston.error('Page error code ' + pageResource.status + ' on ' + url);
            }
            return false;
        }
        return true;
    }

    scrape(url: string, scraper: Function, complete: (IWebPageScraper, any?)=>void){
        let self = this;
        winston.info("Opening " + url);

        this.attachOnResourceReceived(url);

        // set user defined pageSettings
        //this.page.settings = extend(page.settings, config.pageSettings);

        // run the scrape
        this.page.open(url, function(status) {

            if (!self.isValidStatus(url, self.page.resource)) {
                //complete(self.page);
                self.page.close();
                return;
            }           
            
            winston.info('Scraping ' + url);

            //self.injectCommonScripts(self.page.state);
            self.injectConfigLoadScripts(self.scraperConfig.loadScript);
            
            // run scraper(s)
            self.page.waitFor(this.scraperConfig.ready, function(page) {
                    // run each scraper and send any results to writer
                    if (scraper) {
                    // set up callback manager
                    //function checkComplete() {
                        // save state
                        //page.state = page.evaluate(function() {
                        //    return _pjs.state;
                        //});
                        //self.page.state = self.page.evalJs("return _pjs.state;")
                        // run completion callback
                        //complete(page);
                    //}
                    // run all scrapers
                    let validScraper = scraper;                    
                    if (typeof scraper == 'string') {
                        // selector-only scraper
                        //validScraper = Function("return _pjs.getText('" + scraper + "');");
                        self.page.evalJs("return _pjs.getText('" + scraper + "');");
                    }
                    var data = self.page.evalJs(validScraper);
                    complete(self.page, data);
                    //suite.addItem(self.page.evalJs(validScraper));
                    //checkComplete();
                }
            });

            self.page.close();
        });

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

    private complete(scraperResult: any, page: any){
        this._scraper.addItem(scraperResult);

        if (page && this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
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
        }
    }

    launchUrls() {
        var url: string;
        for(url in this.urls){
            new WebScrapper(new WebPageScraperConfig(), this._scraperConfig)
                .scrape(url, this._scraperConfig.scraper, this.complete);
        }
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
        this.config.nightmare = new Nightmare();
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
            this.items.push(item);
    }

    private buildLauncher(urls: string[], launcherConfig: WebPageLauncherConfig) : IWebPageLauncher {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0){
            return new WebPageSerialLauncher(validUrls, this, launcherConfig)
        }
        return null;            
    }

    init () {
        var firstLauncher = this.buildLauncher(Utils.arrify(this.config.url) as string[], new WebPageLauncherConfig());
        if (!firstLauncher)
            return;

        this.launchers.push(firstLauncher);
        var launcher : IWebPageLauncher;
        while (launcher = this.launchers.shift()){
            launcher.launchUrls();
        }

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
    nightmare: Nightmare;

    //
    moreUrls: (string|Function);
    maxDepth: number = 1;
    newHashNewPage: boolean = true;
    scraper: Function;
    allowRepeatedUrls: boolean = false;
    ignoreDuplicates: boolean = true; // ignore data duplicates
    url: string = "http://www.google.com";
}

class WebPageScraperConfig {
    delayBetweenRuns: number = 0;
    timeoutInterval: number = 100;
    timeoutLimit: number = 3000;
    format: string = "json";
    logFile: string = "output.txt";
    outFile: string = "output.json";
}


