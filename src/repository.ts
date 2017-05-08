import * as S from "string";

const Datastore = require('nedb'), 
      db = new Datastore({ filename: 'profiles\\profiles.db', autoload: true });

export class web {
    depth: number = 1;
    isLeaf: boolean = true;
    isVisited: boolean = false;
    isVisitedWithErrors: boolean = false;
    category: string = ""; // domain
    notes: string | string[];
    timestamp: Date;
    fragments: string[];

    data: any;

    constructor (url: string, _type: string = "University", country: string = "CA", category : string = "schoolfinder.com") {
        this.category = category;
        this.data = {
            name: null,
            "_type" : _type,
            url: url,
            contact : {
                country: country,
                email: "",
                phone: "",
                fax: "",
                address: "",
                website: ""
            }
        }
    }

    private validateDataItem(source: any) : any {
        function collapse(text:string) : string {
            return S(text).collapseWhitespace().toString();
        }
        var merged = Object.assign({}, this.data, source);
        merged.contact = Object.assign({}, this.data.contact, source.contact)
        if (S(merged.name).isEmpty()) this.notes += "name not found. ";
        else merged.name = collapse(merged.name);
        if (S(merged.url).isEmpty()) this.notes += "url not found. ";
        if (S(merged._type).isEmpty()) this.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty()) this.notes += "country not found. ";
        merged.contact.country = collapse(merged.contact.country);
        merged.contact.phone = collapse(merged.contact.phone);
        merged.contact.fax = collapse(merged.contact.fax);
        merged.contact.email = collapse(merged.contact.email);
        merged.contact.website = collapse(merged.contact.website);
        merged.contact.address = S(merged.contact.address)
                                    .lines()
                                    .map((l) => collapse(l))
                                    .filter(i => !S(i).isEmpty())
                                    .join(", ");

        this.data = merged;
    }

}

export class Repository {

    getByCategory(category) {
        return new Promise(function (resolve, reject) {
            db.find({category: category}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    getByCategoryNonVisited (category) {
        return new Promise(function (resolve, reject) {
            db.find({category: category, isVisited: false}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    getByCategoryAndUrl(category, url) {
        return new Promise(function (resolve, reject) {
            db.find({category: category, "data.url" : url }, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    removeByCategory(category){
        return new Promise(function (resolve, reject) {
            db.remove({category: category}, {multi: true}, (error, docs) => {
                if (error != null && error != undefined) 
                    return reject(error);
                return resolve(docs);
            });
        });
    }

    upsert (item: web) {
        return new Promise(function (resolve, reject) {
            db.update({category: item.category, "data.name" : item.data.name, "data.url" : item.data.url }, {upsert: true, returnUpdatedDocs: true}, (error, count, docs) => {
                if (error != null && error != undefined) return reject (error);
                return resolve(docs);
            });
        });
    }

    insert (items: web[]) {
        return new Promise(function (resolve, reject) {
            db.insert(items, (error, docs) => {
                if (error != null && error != undefined) return reject (error);
                return resolve(docs);
            });
        });
    }

}