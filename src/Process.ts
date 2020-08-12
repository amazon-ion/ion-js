import fs from 'fs';
import {OutputFormat} from './OutputFormat';
import {IonEventStream} from "./IonEventStream";
import {Writer} from "./IonWriter";
import {ErrorType, IonCliCommonArgs, IonCliError} from "./Cli";
import {makeReader, Reader} from "./Ion";

export const command = 'process <input file..>'

export const describe = "Read the input file(s) (optionally, specifying ReadInstructions or a filter) and re-write in" +
    "the format specified by --output.";

export const handler = function (argv) {
    let args = new IonCliCommonArgs(argv);
    new Process(args);
}

/**
 *  Read the input file(s) and re-write in the format
 *  specified by --output-format
 *
 *  Create error report through --error-report and output file specified by --output
 */
export class Process {

    constructor(parsedArgs: IonCliCommonArgs) {
        let output_writer = OutputFormat.createIonWriter(parsedArgs.getOutputFormatName());
        if(parsedArgs.getOutputFormatName() == OutputFormat.EVENTS) {
            this.processEvents(output_writer, parsedArgs);
        } else {
            this.processFiles(output_writer, parsedArgs);
        }
    }

    getInput(path: string): string | Buffer {
        let options = path.endsWith(".10n") ? null : "utf8";
        return fs.readFileSync(path, options);
    }

    clearIonOutputWriter(ionOutputWriter: Writer){
        while(ionOutputWriter.depth() > 0){
            ionOutputWriter.stepOut();
        }
        ionOutputWriter.close();
    }

    createReaderForProcess(path: string, args: IonCliCommonArgs): Reader {
        let ionReader;
        try{
            ionReader = makeReader(this.getInput(path));
        } catch(Error) {
            new IonCliError(ErrorType.READ, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
        return ionReader;
    }

    processEvents(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
            this.processEvent(ionOutputWriter, args, path);
        }
        args.getOutputFile().write(ionOutputWriter.getBytes());
    }

    processEvent(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        this.writeToEventStream(ionOutputWriter, ionReader, path, args);
    }

    writeToEventStream(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        try{
            let eventStream = new IonEventStream(ionReader);
            // processes ion stream into event stream
            eventStream.writeEventStream(ionOutputWriter);
            ionOutputWriter.close();
        } catch(Error) {
            this.clearIonOutputWriter(ionOutputWriter);
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }

    processFiles(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
                this.processFile(ionOutputWriter, args, path);
            }
        if(args.getOutputFormatName() != OutputFormat.NONE) {
            args.getOutputFile().write(ionOutputWriter.getBytes());
        }
    }

    processFile(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        this.writeToProcessFile(ionOutputWriter, ionReader, path, args);
    }

    writeToProcessFile(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        try{
            ionOutputWriter.writeValues(ionReader);
            ionOutputWriter.close();
        } catch(Error) {
            this.clearIonOutputWriter(ionOutputWriter);
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }
}