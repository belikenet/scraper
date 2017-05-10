import { Inject } from 'di-typescript';

import { DataManager } from "./dataManager";
import { Repository } from "./repository";
import { SettingsWeb } from "./settings.web";
import { WebPageLauncherSettings, WebPageLauncher } from "./webPageLauncher";

@Inject
export class WebPageLauncherFactory {
    //private dataManager: DataManager;
    //private queue: WebPageLauncherQueue;
    //private repository: Repository;
    private settingsWeb: SettingsWeb;
    constructor(settingsWeb: SettingsWeb) {
        this.settingsWeb = settingsWeb;
        //this.repository = repository;
        //this.queue = queue;
        //this.dataManager = dataManager;
    }

    getWebPageLauncher(urls: string[], launcherConfig: WebPageLauncherSettings) : WebPageLauncher {
        return new WebPageLauncher(urls, launcherConfig, this.settingsWeb);
    }
}
