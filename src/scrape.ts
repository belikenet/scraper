import * as winston from "winston";
import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { FileManager } from "./fileManager";
import { Inject } from 'di-typescript';

import { DataManager } from "./dataManager";
import { WebPageLauncherQueue } from "./webPageLauncherQueue";
import { Repository, web } from "./repository";
import { IDataManager } from "./util";
import { EventsDataManager } from "./eventsDataManager";
import * as Enumerable from "linq";

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
        var urls = this.getInitialUrls();
        this.queue.addLauncher(urls);

        var launcher : any;
        while (launcher = this.queue.shift()){
            await launcher.launchUrls((urlPayload, data) => self.completeData(urlPayload, data), (data) => self.completeMoreUrls(data, launcher.launcherConfig));
        }

        this.fileManager.exportOutput(this.dataManager.all());
    }

    private getInitialUrls() {
        if (this.settingsWeb.urlMode == "new") {
            this.repository.removeByProfile(this.settingsWeb.profile);
            return this.fileManager.processInputUrls(this.settingsWeb.url);
        }
        if (this.settingsWeb.urlMode == "error") {
            var errors = this.repository.getByProfileError(this.settingsWeb.profile);
            //in order to work with error, upsert should be called instead of insert
            return Enumerable.from(errors).select((x) => x.value.data.url).toArray();
        }
        if (this.settingsWeb.urlMode == "continue") {
            var nextLinks = this.repository.getByProfileNonVisited(this.settingsWeb.profile);
            //in order to work with continue, upsert should be called instead of insert
            return Enumerable.from(nextLinks).select ((x) => x.value.data.url).toArray();
        }
    }

    createWebMetadata (isLeaf, data) : web {
        var metadata = new web();
        metadata.isLeaf = isLeaf;
        metadata.isVisited = true;
        metadata.profile = this.settingsWeb._profile;
        metadata.timestamp = new Date();

        if (data.notes) {
            metadata.notes = data.notes;
            if (metadata.notes.indexOf("error") > 0)
                metadata.isVisitedWithErrors = true;
        }

        if (data.fragments) {
            metadata.fragments = data.fragments;
            delete(data.fragments);
        }

        metadata.data = data;

        return metadata;
    }

    createWebMetadataSet(isLeaf, data) : web[] {
        var self = this;
        data = Array.isArray(data) ? data : [data];
        return data.map((x) => self.createWebMetadata(isLeaf, x));
    }

    private completeData (urlPayload, data) {
        data = this.dataManager.add(urlPayload, data);
        var metadata = this.createWebMetadataSet(true, data);
        Promise.all([this.repository.upsert(metadata)]);
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

