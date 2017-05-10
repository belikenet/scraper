import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { FileManager } from "./fileManager";
import { Inject } from 'di-typescript';

import { DataManager } from "./dataManager";
import { WebPageLauncherQueue } from "./webPageLauncherQueue";

@Inject
export class Scraper {
    private dataManager: DataManager;
    private queue: WebPageLauncherQueue;
    private fileManager: FileManager;
    private settingsWeb: SettingsWeb;
    private settings : Settings;

    constructor(settingsWeb: SettingsWeb, settings: Settings, fileManager: FileManager, dataManager: DataManager, queue: WebPageLauncherQueue) {
        this.settingsWeb = settingsWeb;
        this.settings = settings;
        this.fileManager = fileManager;
        this.queue = queue;
        this.dataManager = dataManager;
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

    async init () {
        var self = this;
        this.setLogger();
        var urls = this.fileManager.processInputUrls(this.settingsWeb.url);
        this.queue.addLauncher(urls);

        var launcher : any;
        while (launcher = this.queue.shift()){
            await launcher.launchUrls((data) => self.dataManager.add(data), (data) => self.completeMoreUrls(data, launcher.launcherConfig));
        }

        this.fileManager.exportOutput(this.dataManager.all());
    }

    private completeMoreUrls(moreUrls: any[], launcherConfig: any) {
        this.queue.addLauncherChild(moreUrls, launcherConfig)
        //new Repository().insertUrls (moreUrls, this.launcherConfig.depth + 1, this.launcherConfig.depth + 1 == this.scraperConfig.maxDepth).then(() => {});
    }

}

