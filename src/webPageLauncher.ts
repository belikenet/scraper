import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { Utils } from "./util";
import { UrlManager } from "./urlManager";
import { web, Repository } from "./repository";
import { FileManager } from "./fileManager";
import { WebPageLauncherFactory } from "./webPageLauncherFactory";
import { Inject } from 'di-typescript';
import { DataManager } from "./dataManager";
const Nightmare = require ("nightmare");
const vo = require("vo");

//@Inject
export class WebPageLauncherSettings {
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


@Inject
export class WebPageLauncher implements WebPageLauncher {
    //private dataManager: DataManager;
    //private queue: WebPageLauncherQueue;
    //private repository: Repository;
    //private fileManager: FileManager;
    //private _scraper : Scraper;
    private scraperConfig : SettingsWeb;
    readonly launcherConfig : WebPageLauncherSettings;
    readonly urls: string[];

    constructor(urls: string[], launcherConfig: WebPageLauncherSettings, settingsWeb: SettingsWeb) {
        //this._scraper = scraper;
        this.scraperConfig = settingsWeb;
        this.launcherConfig = launcherConfig;
        //this.fileManager = fileManager;
        this.urls = urls;
        //this.repository = repository;
        //this.queue = queue;
        //this.dataManager = dataManager;
    }

    private extractMoreUrls() : any {
        if (this.scraperConfig.moreUrls && (!this.scraperConfig.maxDepth || this.launcherConfig.depth <= this.scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this.scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0) return null;
                //validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "')";
                validMoreUrls = `var ___x= []; document.querySelectorAll("${this.scraperConfig.moreUrls}").forEach((e) => ___x.push(e.href)); return ___x;`;
                return Function (validMoreUrls);
            } else 
                return this.scraperConfig.moreUrls(this.launcherConfig.depth, this.scraperConfig.url);
        }
        return null;
    }

    //private completeMoreUrls(moreUrls: any[]) {
        //this.queue.addLauncherChild(moreUrls, this.launcherConfig)
        //new Repository().insertUrls (moreUrls, this.launcherConfig.depth + 1, this.launcherConfig.depth + 1 == this.scraperConfig.maxDepth).then(() => {});
    //}

    launchUrls(urlComplete: (any?)=>void, complete: (any?)=>void, ) {
        var _self = this;

        return vo(Utils.binarify(this.urls, _self.scraperConfig.instancesCount)
                .map((bin) => this.scrape(bin, _self.scraperConfig.scraper, complete, 
                                               _self.extractMoreUrls(), urlComplete))
        ).catch((error) => {
            winston.error("ERROR: " + error);
        }).then(() => {
            winston.verbose("ending launch Electron instances");
        });
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


