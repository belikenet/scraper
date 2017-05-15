import * as winston from "winston";

import { Inject } from "di-typescript";
import { SettingsWeb } from "./settings.web";
import { Utils, IDataManager } from "./util";
import * as S from "string";
import { urlPayload } from "./webPageLauncher";

export class EventsDataManager implements IDataManager {
    items: any[] = [];

    add(urlPayload: urlPayload, item: any | any[]) {
        var self = this;
        // check for ignoreDuplicates
        if (item) {
            winston.verbose("adding data");
            var items = Utils.isArray(item) ? item : [item];
            items = items.map((x) => this.validateDataItem(x, urlPayload["dataTemplate"]));
            // apply for flattening items
            items = [].concat(items);
            this.items = this.items.concat(items);
        }
    }

    all(): any[] {
        return this.items;
    }

    private validateDataItem(source: any, dataTemplate: any): any {
        var merged = Object.assign({}, dataTemplate, source);

        return merged;
    }

}
