import * as winston from "winston";

import { Inject } from "di-typescript";
import { SettingsWeb } from "./settings.web";
import { Utils } from "./util";
import * as S from "string";

@Inject
export class DataManager {
    private settingsWeb: SettingsWeb;
    items: any[] = []; 

    constructor(settingsWeb: SettingsWeb) {
        this.settingsWeb = settingsWeb;
    }

    add(item: any|any[]) {
        var self = this;
        // check for ignoreDuplicates
        if (item)
        {
            winston.verbose("adding data");
            var items = Utils.isArray(item) ? item : [item];
            items = items.map((x) => this.validateDataItem(x));
            this.items = this.items.concat(items);
            // apply for flattening items
            this.items = [].concat(this.items);
        }
    }

    all() : any[] {
        return this.items;
    }

    private collapse(text:string) : string {
        return S(text).collapseWhitespace().toString();
    }

    private validateDataItem(source: any) : any {
        var merged = Object.assign({}, this.settingsWeb.dataTemplate, source);
        merged.contact = Object.assign({}, this.settingsWeb.dataTemplate.contact, source.contact)
        if (S(merged.name).isEmpty()) merged.notes += "name not found. ";
        else merged.name = this.collapse(merged.name);
        if (S(merged.url).isEmpty()) merged.notes += "url not found. ";
        if (S(merged._type).isEmpty()) merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty()) merged.notes += "country not found. ";
        merged.contact.country = this.collapse(merged.contact.country);
        merged.contact.phone = this.collapse(merged.contact.phone);
        merged.contact.fax = this.collapse(merged.contact.fax);
        merged.contact.email = this.collapse(merged.contact.email);
        merged.contact.website = this.collapse(merged.contact.website);
        merged.contact.address = S(merged.contact.address)
                                    .lines()
                                    .map((l) => this.collapse(l))
                                    .filter(i => !S(i).isEmpty())
                                    .join(", ");

        return merged;
    }

}
