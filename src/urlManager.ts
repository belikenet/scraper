import { Settings } from "./settings";
import { SettingsWeb } from "./settings.web";
import { Inject } from 'di-typescript';
import * as S from "string";


@Inject
export class UrlManager {
    visitedUrls : string[] = [];
    private settings: Settings;

    /**
     *
     */
    constructor(settings: Settings) {
        this.settings = settings;
    }

    private tryAddUrl (url: string) : boolean {
        if (S(url).isEmpty()) return false;
        url = this.settings.newHashNewPage ? url.split('#')[0] : url;
        var isValidUrl = (!(this.settings.allowRepeatedUrls && url in this.visitedUrls))
        if (isValidUrl)
            this.visitedUrls.push(url);
        return isValidUrl;
    }

    addUrls (urls: string[]) : string[]{
        var _self = this;
        if (urls === null || urls === undefined) return urls;
        return urls.filter(function(u) { return _self.tryAddUrl(u); });
    }
}
