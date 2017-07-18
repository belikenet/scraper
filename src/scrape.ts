import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { FileManager } from "./fileManager";
import { Inject } from 'di-typescript';

import { DataManager } from "./dataManager";
import { WebPageLauncherQueue } from "./webPageLauncherQueue";
import { Repository } from "./repository";
import { IDataManager } from "./util";
import { EventsDataManager } from "./eventsDataManager";

@Inject
export class Scraper {
    private repository: Repository;
    private dataManager: IDataManager;
    private queue: WebPageLauncherQueue;
    private fileManager: FileManager;
    private settingsWeb: SettingsWeb;
    private settings : Settings;

    constructor(settingsWeb: SettingsWeb, settings: Settings, fileManager: FileManager, dataManager: DataManager, queue: WebPageLauncherQueue, repository: Repository) {
        this.settingsWeb = settingsWeb;
        this.settings = settings;
        this.fileManager = fileManager;
        this.queue = queue;
        this.dataManager = dataManager;
        this.repository = repository;
    }

    private setLogger () {
        if (process.env.DEBUG && !this.settings.logLevel) 
            this.settings.logLevel = "verbose";
        if (this.settings.logLevel){
            //winston.level = this.settings.logLevel
            winston.transports.Console.level = this.settings.logLevel;
            winston.transports.Console.colorize = true;
            winston.transports.Console.prettyPrint = true;
        }
    }

    async init () {
        var self = this;
        this.setLogger();
        var urls = this.fileManager.processInputUrls(this.settingsWeb.url);
        this.queue.addLauncher(urls);

        var launcher : any;
        while (launcher = this.queue.shift()){
            await launcher.launchUrls((urlPayload, data) => self.dataManager.add(urlPayload, data), (data) => self.completeMoreUrls(data, launcher.launcherConfig));
        }

        this.fileManager.exportOutput(this.dataManager.all());
    }

    private completeMoreUrls(moreUrls: any[], launcherConfig: any) {
        if (this.settingsWeb.exportUrls)
            // customize filename in settings
            this.fileManager.exportOutputJson(moreUrls, "urls.json");
        if (launcherConfig.depth + 1 <= this.settingsWeb.maxDepth) {
            this.queue.addLauncherChild(moreUrls, launcherConfig)
        }
    }

}

