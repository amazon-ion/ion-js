import fs from 'fs';
import {OutputFormat} from './OutputFormat';
import {IonEventStream} from "./IonEventStream";
import {Writer} from "./IonWriter";
import {ErrorType, IonCliCommonArgs, IonCliError} from "./Cli";
import {IonTypes, makeReader, Reader} from "./Ion";

/**
 * The `command`, `describe`, and `handler` exports below are part of the yargs command module API
 * See: https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
export const command = 'process <input-file..>'

export const describe = "Read the input file(s) (optionally, specifying ReadInstructions or a filter) and re-write in" +
    "the format specified by --output.";

export const handler = function (argv) {
    let args = new IonCliCommonArgs(argv);
    new Process(args);
}

/**
 *  Read the input file(s) and re-write in the format specified by --output-format
 *  Create error report through --error-report and output file specified by --output
 */
export class Process {
    private EVENT_STREAM = "$ion_event_stream";

    constructor(parsedArgs: IonCliCommonArgs) {
        let output_writer = OutputFormat.createIonWriter(parsedArgs.getOutputFormatName());
        if (output_writer) {
            if (parsedArgs.getOutputFormatName() == OutputFormat.EVENTS) {
                this.processEvents(output_writer, parsedArgs);
            } else {
                this.processFiles(output_writer, parsedArgs);
            }
        }
    }

    getInput(path: string): string | Buffer {
        let options = path.endsWith(".10n") ? null : "utf8";
        return fs.readFileSync(path, options);
    }

    createReaderForProcess(path: string, args: IonCliCommonArgs): Reader {
        let ionReader;
        try {
            ionReader = makeReader(this.getInput(path));
        } catch (Error) {
            new IonCliError(ErrorType.READ, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
        return ionReader;
    }

    isEventStream(ionReader: Reader): boolean {
        let type = ionReader.next();
        return type != null
            && type == IonTypes.SYMBOL
            && ionReader.stringValue() == this.EVENT_STREAM;
    }

    processEvents(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
            this.processEvent(ionOutputWriter, args, path);
        }
    }

    processEvent(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        this.writeToEventStream(ionOutputWriter, ionReader, path, args);
    }

    writeToEventStream(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        let eventStream;
        try {
            eventStream = new IonEventStream(ionReader, path, args);

            // processes input stream into event stream
            eventStream.writeEventStream(ionOutputWriter);
            ionOutputWriter.close();
            args.getOutputFile().write(ionOutputWriter.getBytes());
        } catch (Error) {
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }

    processFiles(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
            this.processFile(ionOutputWriter, args, path);
        }
    }

    processFile(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        if (this.isEventStream(ionReader)) {
            let reader = this.createReaderForProcess(path, args);
            this.writeToProcessFileFromEventStream(ionOutputWriter, reader, path, args);
        } else {
            this.writeToProcessFile(ionOutputWriter, ionReader, path, args);
        }
    }

    writeToProcessFileFromEventStream(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        try {
            let eventStream = new IonEventStream(ionReader, path, args);
            eventStream.writeIon(ionOutputWriter);
            args.getOutputFile().write(ionOutputWriter.getBytes());
        } catch (Error) {
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }

    writeToProcessFile(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        try {
            ionOutputWriter.writeValues(ionReader);
            ionOutputWriter.close();
            args.getOutputFile().write(ionOutputWriter.getBytes());
        } catch (Error) {
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }
}