export class Settings {
    debugResponse: boolean = false;
    debugRequest: boolean = false;
    //debug: boolean = false;
    logLevel:string = null; // silly, debug, verbose, info, warn, error  
    delayBetweenRuns: number = 0;
    timeoutInterval: number = 100;
    timeoutLimit: number = 3000;
    format: string = "csv";
    outFolder: string = ".//profiles";
    logFile: string = "output.txt";
    outFile: string = "output.csv";
    newHashNewPage: boolean = true;
    allowRepeatedUrls: boolean = false;
}
