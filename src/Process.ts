import {OutputFormat} from './OutputFormat';
import {IonEventStream} from "./IonEventStream";
import {Writer} from "./IonWriter";
import {options} from 'yargs';
import {makeReader} from "./Ion";
import * as fs from 'fs';

const argv = options({
    'output': {
        alias: 'o',
        description: 'Output file',
    },
    'output-format': {
        alias: 'f',
        choices: ['pretty', 'text', 'binary', 'events'] as const,
        default: 'pretty',
        description: "Output format, from the set (text | pretty | binary |\n"
            + "events | none). 'events' is only available with the\n"
            + "'process' command, and outputs a serialized EventStream\n"
            + "representing the input Ion stream(s)."
    },
    'error-report': {
        alias: 'e',
        description: 'Error report file',
    }
}).argv;

class ProcessArgs {
    inputFiles: Array<string>;
    outputFile: any;
    outputFormatName: string;
    errorReportFile: any;

    constructor() {
        // create output stream (DEFAULT: stdout)
        this.outputFile = argv["output"] ? fs.createWriteStream(<string> argv["output"], {flags : 'w'}) : process.stdout;
        // create error output stream (DEFAULT: stderr)
        this.errorReportFile = argv["error-report"] ? fs.createWriteStream(<string> argv["error-report"], {flags : 'w'}) : process.stderr;
        this.outputFormatName = <string> argv["output-format"];
        this.inputFiles = argv._;
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

    getOutputFormatName(): OutputFormat{
        return <OutputFormat> this.outputFormatName;
    }
}

/** Error structure for error report */
class ProcessError {
    errorType: string;
    location: string;
    message: string;
    errorReportFile: any;

    constructor(errorType: string, location: string, message: string, errorReportFile: any) {
        this.errorType = errorType;
        this.location = location;
        this.message = message;
        this.errorReportFile = errorReportFile;
    }

    writeErrorReport() {
        this.errorReportFile.write(this.errorType + ": " + this.location + " " + this.message + "\n");
    }
}

/**
 *  Read the input file(s) and re-write in the format
 *  specified by --output-format
 *
 *  Create error report through --error-report and output file specified by --output
 */
class Process {

    constructor() {
        let parsedArgs = new ProcessArgs();
        let output_writer = OutputFormat.createIonWriter(parsedArgs.getOutputFormatName());
        if(parsedArgs.getOutputFormatName() == "events") {
            this.processEvents(output_writer, parsedArgs);
        } else {
            this.processFiles(output_writer, parsedArgs);
        }
    }

    getInput(path: string): string | Buffer {
        let options = path.endsWith(".10n") ? null : "utf8";
        return fs.readFileSync(path, options);
    }

    processEvents(ionOutputWriter: Writer, args: ProcessArgs): void {
        for (let path of args.getInputFiles()) {
            try{
                let ionReader = makeReader(this.getInput(path));
                let eventStream = new IonEventStream(ionReader);
                // processes ion stream into event stream
                eventStream.writeEventStream(ionOutputWriter);
                ionOutputWriter.close();
                args.getOutputFile().write(ionOutputWriter.getBytes());
            } catch(Error) {
                new ProcessError("Process Events", path, Error.message, args.getErrorReportFile()).writeErrorReport();
            }
        }
    }

    processFiles(ionOutputWriter: Writer, args: ProcessArgs): void {
        for (let path of args.getInputFiles()) {
            try{
                let ionReader = makeReader(this.getInput(path));
                ionOutputWriter.writeValues(ionReader);
                ionOutputWriter.close();
                args.getOutputFile().write(ionOutputWriter.getBytes());
            } catch(Error) {
                new ProcessError("Process Files", path, Error.message, args.getErrorReportFile()).writeErrorReport();
            }
        }
    }
}

let p = new Process();


