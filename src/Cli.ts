import yargs from "yargs";
import fs from "fs";
import {OutputFormat} from "./OutputFormat";

/** common CLI arguments structure */
export class IonCliCommonArgs {
    inputFiles: Array<string>;
    outputFile: any;
    outputFormatName: OutputFormat;
    errorReportFile: any;

    constructor(argv: yargs.Arguments) {
        this.outputFile = argv["output"] ? fs.createWriteStream(<string>argv["output"], {flags: 'w'}) : process.stdout;
        // create error output stream (DEFAULT: stderr)
        this.errorReportFile = argv["error-report"] ? fs.createWriteStream(<string>argv["error-report"], {flags: 'w'}) : process.stderr;
        this.outputFormatName = <OutputFormat>argv["output-format"];
        this.inputFiles = <Array<string>>argv["inputfile"];
    }

    getOutputFile(): any {
        return this.outputFile;
    }

    getErrorReportFile(): any {
        return this.errorReportFile;
    }

    getInputFiles(): Array<string> {
        return this.inputFiles;
    }

    getOutputFormatName(): OutputFormat {
        return this.outputFormatName;
    }
}

/** Error Types symbol[READ | WRITE | STATE] */
export enum ErrorType {
    READ = "READ",
    WRITE = "WRITE",
    STATE = "STATE"
}

/** Error structure for error report */
export class IonCliError {
    errorType: ErrorType;
    location: string;
    message: string;
    errorReportFile: any;

    constructor(errorType: ErrorType, location: string, message: string, errorReportFile: any) {
        this.errorType = errorType;
        this.location = location;
        this.message = message;
        this.errorReportFile = errorReportFile;
    }

    writeErrorReport() {
        this.errorReportFile.write(this.errorType + ": " + this.location + " " + this.message + "\n");
    }
}

const argv = yargs
    .commandDir(__dirname,{
        extensions: ['ts'],
    })
    .options({
        'output': {
            alias: 'o',
            description: 'Output location. [default: stdout]',
        },
        'output-format': {
            alias: 'f',
            choices: ['pretty', 'text', 'binary', 'events', 'none'] as const,
            default: 'pretty',
            description: "Output format, from the set (text | pretty | binary |\n"
                + "events | none). 'events' is only available with the\n"
                + "'process' command, and outputs a serialized EventStream\n"
                + "representing the input Ion stream(s)."
        },
        'error-report': {
            alias: 'e',
            description: 'ErrorReport location. [default: stderr]',
        }
    }).argv;




