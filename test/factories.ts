import {Settings} from "../src/settings";
import {UrlManager} from "../src/urlManager";
import { SettingsWeb } from "../src/settings.web";

export class UrlManagerFactory {
    static simple(urls: string[] = null, defaultSettings?: any) {
        var settings = SettingsFactory.empty(defaultSettings);
        var urlManager = new UrlManager(settings);

        if (urls!=null)
            urlManager.addUrls(urls);

        return {urlManager, settings};
    }    
}

export class SettingsFactory {
    
    protected static TestSettings = class extends Settings {
        constructor() {
            super();
            this.allowRepeatedUrls = 
            this.debugRequest =
            this.debugResponse =
            this.newHashNewPage = false;
            this.delayBetweenRuns = 
            this.timeoutInterval =
            this.timeoutLimit = 0;
            this.format =
            this.logFile =
            this.outFile = 
            this.outFolder = null;
        }
    }

    static empty (defaultArguments?: any) : Settings {
        var settings = new SettingsFactory.TestSettings();
        return { ...settings, ...defaultArguments }
    }
}

export class SettingsWebFactory {
    protected static TestSettingsWeb = class extends SettingsWeb {
        constructor(settings: Settings) {
            super(settings);
            this.url = "";
            this.maxDepth = 1;
            this.instancesCount = 2;
            this.defaultTemplateValues = null;
            this.injectJQuery = false;
            this.exportUrls = true;
            this.profile = "";
            this.moreUrls = null;
            this.scraper = null;
            this.dataTemplate = {
                                    name: null,
                                    "_type" : "",
                                    url: null,
                                    contact : {
                                        country: "",
                                        email: "",
                                        phone: "",
                                        fax: "",
                                        address: "",
                                        website: ""
                                    },
                                    "notes": ""
                                };
        }

        //init (settings:Settings) { super.init(settings); }
    }

    static empty (settings: Settings, defaultArguments?: any) : SettingsWeb {
        var settingsWeb = new SettingsWebFactory.TestSettingsWeb(settings);
        var initF = settingsWeb.init;
        settingsWeb = { ...settingsWeb, ...defaultArguments };
        settingsWeb.init = initF;
        settingsWeb.init(settings);
        return settingsWeb;
    }
}
