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

//type urlPayload = interface iUrlPayload { url:  }
class IUrlPayload {
    url: string;
    [key:string] : any; // any property
}

export type urlPayload = string | IUrlPayload;

export function isUrlPayload(urlPayload: urlPayload) : urlPayload is IUrlPayload {
    let r = (urlPayload as IUrlPayload).url !== undefined;
    return r;
}

export class WebPageLauncherSettings {
    readonly depth: number;

    constructor(depth?: number, ) {
        this.depth = depth || 1;
    }

    buildChild() : WebPageLauncherSettings {
        var nextDepth = this.depth + 1;
        return new WebPageLauncherSettings(nextDepth);
    }
}


@Inject
export class WebPageLauncher implements WebPageLauncher {
    private scraperConfig : SettingsWeb;
    readonly launcherConfig : WebPageLauncherSettings;
    readonly urls: urlPayload[];

    constructor(urls: urlPayload[], launcherConfig: WebPageLauncherSettings, settingsWeb: SettingsWeb) {
        this.scraperConfig = settingsWeb;
        this.launcherConfig = launcherConfig;
        this.urls = urls;
    }

    launchUrls(complete: (any?)=>void, urlComplete: (urlPayload: urlPayload, any?)=>void) {
        var _self = this;

        return vo(Utils.binarify(this.urls, _self.scraperConfig.instancesCount)
                .map((bin) => this.scrape(bin, _self.scraperConfig.scraperAction(), complete, 
                                               _self.scraperConfig.moreUrlsAction, urlComplete))
        ).catch((error) => {
            winston.error("ERROR: " + error);
        }).then(() => {
            winston.verbose("ending launch Electron instances");
        });
    }

    *scrape (urls: urlPayload[], dataScraper: Function, complete: (urlPayload, any?)=>void, urlScraper: (any) => void, urlComplete: (any?)=>void) : any
    {
        if (urls == null || urls.length == 0) 
            return Promise.resolve();

        let _self = this;

        var nightmare = Nightmare({show: true, pollInterval: 800, webPreferences: {images: false}});

        for (var i in urls){
            yield workflow(urls[i]);
        }

        yield nightmare.end();

        function *workflow(urlPayload: urlPayload) {
            var url = (isUrlPayload(urlPayload)) ? urlPayload.url : urlPayload;
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

                if (_self.launcherConfig.depth == _self.scraperConfig.maxDepth){
                    if (dataScraper != null)
                        {
                            item = yield vo(dataScraper(nightmare));
                        }
                } else {                    
                    if (urlScraper != null){
                        var data = yield vo(urlScraper(nightmare));

                        urlComplete(data);
                        createOrUpdateItemNotes("INDEX page. ")
                    }
                }
            }

            yield vo(subWorkflow)
                .catch((error) => {
                    winston.error(error);
                    createOrUpdateItemNotes(`${error} `);
                })
                .then (() => {
                    if (item != null)
                        {
                            complete(urlPayload, item);
                        }
                });
        }    
    }

}


