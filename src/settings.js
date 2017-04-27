"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Settings {
    constructor() {
        this.debugResponse = false;
        this.debugRequest = false;
        this.debug = false;
        this.delayBetweenRuns = 0;
        this.timeoutInterval = 100;
        this.timeoutLimit = 3000;
        this.format = "csv";
        this.outFolder = ".//profiles";
        this.logFile = "output.txt";
        this.outFile = "output.csv";
        this.newHashNewPage = true;
        this.allowRepeatedUrls = false;
    }
}
exports.Settings = Settings;
//# sourceMappingURL=settings.js.map