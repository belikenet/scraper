import { Inject } from 'di-typescript';

import { SettingsWeb } from "./settings.web";
import { WebPageLauncherSettings, WebPageLauncher, urlPayload } from "./webPageLauncher";

@Inject
export class WebPageLauncherFactory {
    private settingsWeb: SettingsWeb;
    constructor(settingsWeb: SettingsWeb) {
        this.settingsWeb = settingsWeb;
    }

    getWebPageLauncher(urls: urlPayload[], launcherConfig: WebPageLauncherSettings) : WebPageLauncher {
        return new WebPageLauncher(urls, launcherConfig, this.settingsWeb);
    }
}
