import yargs from "yargs";
import fs, {WriteStream} from "fs";
import {OutputFormat} from "./OutputFormat";
import {IonTypes, makeTextWriter} from "./Ion";
import {ComparisonContext, ComparisonType} from "./Compare";

/** common CLI arguments structure */
export class IonCliCommonArgs {
    inputFiles: Array<string>;
    outputFile: WriteStream | NodeJS.WriteStream;
    outputFormatName: OutputFormat;
    errorReportFile: WriteStream | NodeJS.WriteStream;

    constructor(argv: yargs.Arguments) {
        this.outputFile = argv["output"] ? fs.createWriteStream(argv["output"] as string, {flags: 'w'}) : process.stdout;
        // create error output stream (DEFAULT: stderr)
        this.errorReportFile = argv["error-report"] ? fs.createWriteStream(argv["error-report"] as string, {flags: 'w'}) : process.stderr;
        this.outputFormatName = argv["output-format"] as OutputFormat;
        this.inputFiles = argv["input-file"] as Array<string>;
    }

    getOutputFile(): WriteStream | NodeJS.WriteStream {
        return this.outputFile;
    }

    getErrorReportFile(): WriteStream | NodeJS.WriteStream {
        return this.errorReportFile;
    }

    getInputFiles(): Array<string> {
        return this.inputFiles;
    }

    getOutputFormatName(): OutputFormat {
        return this.outputFormatName;
    }
}

/** CLI arguments for compare structure */
export class IonCompareArgs extends IonCliCommonArgs{
    comparisonType : ComparisonType;

    constructor(props) {
        super(props);
        this.comparisonType = props["comparison-type"] as ComparisonType;
    }

    getComparisonType(): ComparisonType {
        return this.comparisonType;
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
    eventIndex: number;
    location: string;
    message: string;
    errorReportFile: any;

    constructor(errorType: ErrorType, location: string, message: string, errorReportFile: any, eventIndex: number = 0) {
        this.errorType = errorType;
        this.location = location;
        this.message = message;
        this.errorReportFile = errorReportFile;
        this.eventIndex = eventIndex;
    }

    writeErrorReport() {
        let writer = makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('error_type');
        writer.writeSymbol(this.errorType);
        writer.writeFieldName('message');
        writer.writeString(this.message);
        writer.writeFieldName('location');
        writer.writeString(this.location);
        writer.writeFieldName('event_index');
        writer.writeInt(this.eventIndex);
        writer.stepOut();
        this.errorReportFile.write(writer.getBytes());
        this.errorReportFile.write("\n");
    }
}

/** Comparison result types for the comparison report */
export enum ComparisonResultType {
    EQUAL = "EQUAL",
    NOT_EQUAL = "NOT_EQUAL",
    ERROR = "ERROR"
}

/** comparison result with event index and message **/
export class ComparisonResult {
    message: string;
    result: ComparisonResultType;
    actualIndex: number;
    expectedIndex: number;

    constructor(result: ComparisonResultType, message: string = "", actualIndex: number = 0, expectedIndex: number = 0) {
        this.result = result;
        this.message = message;
        this.actualIndex = actualIndex;
        this.expectedIndex = expectedIndex;
    }
}

export class IonComparisonReport {
    lhs: ComparisonContext;
    rhs: ComparisonContext;
    comparisonReportFile: WriteStream| NodeJS.WriteStream;
    comparisonType: ComparisonType;

    constructor(lhs: ComparisonContext, rhs: ComparisonContext, comparisonReportFile: WriteStream| NodeJS.WriteStream, comprisonType: ComparisonType) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.comparisonReportFile = comparisonReportFile;
        this.comparisonType = comprisonType;
    }

    writeComparisonReport(result: ComparisonResultType, message: string, event_index_lhs: number, event_index_rhs: number) {
        let writer = makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('result');
        writer.writeSymbol(result);
        this.lhs.writeComparisonContext(writer, "lhs", event_index_lhs);
        this.rhs.writeComparisonContext(writer, "rhs", event_index_rhs);
        writer.writeFieldName('message');
        writer.writeString(message);
        writer.stepOut();
        this.comparisonReportFile.write(writer.getBytes());
        this.comparisonReportFile.write("\n");
    }
}

/**
 * This will cause `yargs` to look in other .ts files in the same directory for command modules.
 *
 * For more information, see:
 * Command modules: https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 * commandDir: https://github.com/yargs/yargs/blob/master/docs/advanced.md#commanddirdirectory-opts
 */
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




