import * as winston from "winston";

import { Inject } from "di-typescript";
import { WebPageLauncherFactory } from "./webPageLauncherFactory";
import { FileManager } from "./fileManager";
import { SettingsWeb } from "./settings.web";
import { UrlManager } from "./urlManager";
import { WebPageLauncher, WebPageLauncherSettings, urlPayload, isUrlPayload } from "./webPageLauncher";

@Inject
export class WebPageLauncherQueue {
    private factory: WebPageLauncherFactory;
    private fileManager: FileManager;
    private settingsWeb: SettingsWeb;
    private urlManager: UrlManager;
    private launchers: WebPageLauncher[] = [];

    constructor(settingsWeb:SettingsWeb, urlManager: UrlManager,  fileManager: FileManager, factory: WebPageLauncherFactory){
        this.urlManager = urlManager;
        this.settingsWeb = settingsWeb;
        this.fileManager = fileManager;
        this.factory = factory;
    }


    addLauncher(urls: urlPayload[], launcherSettings: WebPageLauncherSettings = new WebPageLauncherSettings()) : void{
        if (urls && Array.isArray(urls) && urls.length > 0)
        {
            winston.verbose('Found ' + urls.length + ' additional urls to scrape');
            var newLauncher = this.buildLauncher(urls, launcherSettings);
            if (newLauncher)
                this.launchers.push(newLauncher);
        }
    }

    addLauncherChild(urls: string[], launcherSettings: WebPageLauncherSettings) {
        this.addLauncher(urls, launcherSettings.buildChild());
    }

    private buildLauncher(urls: urlPayload[], launcherConfig: WebPageLauncherSettings) : WebPageLauncher {
        var validUrls = this.urlManager.addUrls(urls.map((x) => isUrlPayload(x)?x.url:x));
        if (validUrls.length > 0)
        {
            return this.factory.getWebPageLauncher(urls.filter((x) => validUrls.indexOf(isUrlPayload(x)?x.url:x) > -1), launcherConfig);
        }

        return null;            
    }

    shift() : WebPageLauncher {
        return this.launchers.shift();
    }

    all() : WebPageLauncher[] {
        return this.launchers;
    }

}
