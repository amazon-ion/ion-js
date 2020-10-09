/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { ComparisonResult } from "../ComparisonResult";
import { ComparisonResultType } from "../ComparisonResult";
import { defaultLocalSymbolTable, makeReader, ReaderOctetBuffer } from "../Ion";
import { BinaryReader } from "../IonBinaryReader";
import { Reader } from "../IonReader";
import { BinarySpan } from "../IonSpan";
import { IonType } from "../IonType";
import { IonTypes } from "../IonTypes";
import { Writer } from "../IonWriter";
import { EventStreamError } from "./EventStreamError";
import { IonEvent, IonEventFactory, IonEventType } from "./IonEvent";

// constants to be used for EventStream error
const READ = "READ";
const WRITE = "WRITE";

export class IonEventStream {
  events: IonEvent[];
  private reader: Reader;
  private eventFactory: IonEventFactory;
  isEventStream: boolean; // whether the reader has an event stream as input

  constructor(reader: Reader) {
    this.events = [];
    this.reader = reader;
    this.eventFactory = new IonEventFactory();
    this.isEventStream = false;
    this.generateStream();
  }

  writeEventStream(writer: Writer) {
    writer.writeSymbol("$ion_event_stream");
    for (let i: number = 0; i < this.events.length; i++) {
      this.events[i].write(writer);
    }
  }

  writeIon(writer: Writer) {
    try {
      let tempEvent: IonEvent;
      let isEmbedded = false;
      for (let indice: number = 0; indice < this.events.length; indice++) {
        tempEvent = this.events[indice];
        if (tempEvent.fieldName !== null) {
          writer.writeFieldName(tempEvent.fieldName);
        }
        if (
          (tempEvent.ionType == IonTypes.SEXP ||
            tempEvent.ionType == IonTypes.LIST) &&
          this.isEmbedded(tempEvent)
        ) {
          isEmbedded = true;
        }
        writer.setAnnotations(tempEvent.annotations);
        switch (tempEvent.eventType) {
          case IonEventType.SCALAR:
            if (tempEvent.ionValue == null) {
              writer.writeNull(tempEvent.ionType!);
              return;
            }
            if (isEmbedded) {
              writer.writeString(tempEvent.ionValue.toString());
              break;
            }
            switch (tempEvent.ionType) {
              case IonTypes.BOOL:
                writer.writeBoolean(tempEvent.ionValue);
                break;
              case IonTypes.STRING:
                writer.writeString(tempEvent.ionValue);
                break;
              case IonTypes.SYMBOL:
                writer.writeSymbol(tempEvent.ionValue);
                break;
              case IonTypes.INT:
                writer.writeInt(tempEvent.ionValue);
                break;
              case IonTypes.DECIMAL:
                writer.writeDecimal(tempEvent.ionValue);
                break;
              case IonTypes.FLOAT:
                writer.writeFloat64(tempEvent.ionValue);
                break;
              case IonTypes.NULL:
                writer.writeNull(tempEvent.ionType);
                break;
              case IonTypes.TIMESTAMP:
                writer.writeTimestamp(tempEvent.ionValue);
                break;
              case IonTypes.CLOB:
                writer.writeClob(tempEvent.ionValue);
                break;
              case IonTypes.BLOB:
                writer.writeBlob(tempEvent.ionValue);
                break;
              default:
                throw new Error("unexpected type: " + tempEvent.ionType!.name);
            }
            break;
          case IonEventType.CONTAINER_START:
            writer.stepIn(tempEvent.ionType!);
            break;
          case IonEventType.CONTAINER_END:
            if (isEmbedded) {
              isEmbedded = false;
            }
            writer.stepOut();
            break;
          case IonEventType.STREAM_END:
            break;
          case IonEventType.SYMBOL_TABLE:
            throw new Error("Symboltables unsupported.");
          default:
            throw new Error("Unexpected event type: " + tempEvent.eventType);
        }
      }
      writer.close();
    } catch (error) {
      // This Error will be used by the test-driver to differentiate errors using error types.
      throw new EventStreamError(
        WRITE,
        error.message,
        this.events.length,
        this.events,
      );
    }
  }

  getEvents(): IonEvent[] {
    return this.events;
  }

  equals(expected: IonEventStream): boolean {
    return this.compare(expected).result == ComparisonResultType.EQUAL;
  }

  /**
   *  compares eventstreams and generates comparison result
   */
  compare(expected: IonEventStream): ComparisonResult {
    let actualIndex: number = 0;
    let expectedIndex: number = 0;
    if (this.events.length != expected.events.length) {
      return new ComparisonResult(
        ComparisonResultType.NOT_EQUAL,
        "The event streams have different lengths",
      );
    }
    while (
      actualIndex < this.events.length &&
      expectedIndex < expected.events.length
    ) {
      const actualEvent = this.events[actualIndex];
      const expectedEvent = expected.events[expectedIndex];
      if (actualEvent.eventType === IonEventType.SYMBOL_TABLE) { actualIndex++; }
      if (expectedEvent.eventType === IonEventType.SYMBOL_TABLE) {
        expectedIndex++;
      }
      if (
        actualEvent.eventType === IonEventType.SYMBOL_TABLE ||
        expectedEvent.eventType === IonEventType.SYMBOL_TABLE
      ) {
        continue;
      }
      switch (actualEvent.eventType) {
        case IonEventType.SCALAR: {
          const eventResult = actualEvent.compare(expectedEvent);
          if (eventResult.result == ComparisonResultType.NOT_EQUAL) {
            eventResult.actualIndex = actualIndex;
            eventResult.expectedIndex = expectedIndex;
            return eventResult;
          }
          break;
        }
        case IonEventType.CONTAINER_START: {
          const eventResult = actualEvent.compare(expectedEvent);
          if (eventResult.result == ComparisonResultType.NOT_EQUAL) {
            actualIndex += eventResult.actualIndex;
            expectedIndex += eventResult.expectedIndex;

            eventResult.actualIndex = actualIndex;
            eventResult.expectedIndex = expectedIndex;
            return eventResult;
          } else {
            if (
              actualEvent.ionValue !== null &&
              expectedEvent.ionValue !== null
            ) {
              actualIndex = actualIndex + actualEvent.ionValue.length;
              expectedIndex = expectedIndex + expectedEvent.ionValue.length;
            }
          }
          break;
        }
        case IonEventType.CONTAINER_END:
        case IonEventType.STREAM_END: {
          //no op
          break;
        }
        default: {
          throw new Error("Unexpected event type: " + actualEvent.eventType);
        }
      }
      actualIndex++;
      expectedIndex++;
    }
    return new ComparisonResult(ComparisonResultType.EQUAL);
  }

  isEmbedded(event: IonEvent): boolean {
    if (event.annotations[0] === "embedded_documents") {
      return true;
    }
    return false;
  }

  private generateStream(): void {
    try {
      let tid: IonType | null = this.reader.next();
      if (
        tid === IonTypes.SYMBOL &&
        this.reader.stringValue() === "$ion_event_stream"
      ) {
        this.marshalStream();
        this.isEventStream = true;
        return;
      }
      const currentContainer: IonEvent[] = [];
      const currentContainerIndex: number[] = [];
      while (true) {
        if (this.reader.isNull()) {
          this.events.push(
            this.eventFactory.makeEvent(
              IonEventType.SCALAR,
              tid!,
              this.reader.fieldName(),
              this.reader.depth(),
              this.reader.annotations(),
              true,
              this.reader.value(),
            ),
          );
        } else {
          switch (tid) {
            case IonTypes.LIST:
            case IonTypes.SEXP:
            case IonTypes.STRUCT: {
              const containerEvent = this.eventFactory.makeEvent(
                IonEventType.CONTAINER_START,
                tid,
                this.reader.fieldName(),
                this.reader.depth(),
                this.reader.annotations(),
                false,
                null,
              );
              this.events.push(containerEvent);
              currentContainer.push(containerEvent);
              currentContainerIndex.push(this.events.length);
              this.reader.stepIn();
              break;
            }
            case null: {
              if (this.reader.depth() === 0) {
                this.events.push(
                  this.eventFactory.makeEvent(
                    IonEventType.STREAM_END,
                    IonTypes.NULL,
                    null,
                    this.reader.depth(),
                    [],
                    false,
                    undefined,
                  ),
                );
                return;
              } else {
                this.reader.stepOut();
                this.endContainer(
                  currentContainer.pop()!,
                  currentContainerIndex.pop()!,
                );
              }
              break;
            }
            default: {
              this.events.push(
                this.eventFactory.makeEvent(
                  IonEventType.SCALAR,
                  tid,
                  this.reader.fieldName(),
                  this.reader.depth(),
                  this.reader.annotations(),
                  false,
                  this.reader.value(),
                ),
              );
              break;
            }
          }
        }
        tid = this.reader.next();
      }
    } catch (error) {
      // This Error will be used by the test-driver to differentiate errors using error types.
      throw new EventStreamError(
        READ,
        error.message,
        this.events.length,
        this.events,
      );
    }
  }

  private endContainer(thisContainer: IonEvent, thisContainerIndex: number) {
    this.events.push(
      this.eventFactory.makeEvent(
        IonEventType.CONTAINER_END,
        thisContainer.ionType!,
        null,
        thisContainer.depth,
        [],
        false,
        null,
      ),
    );
    thisContainer.ionValue = this.events.slice(
      thisContainerIndex,
      this.events.length,
    );
  }

  //(event_type: EventType, ion_type: IonType, field_name: SymbolToken, annotations: list<SymbolToken>, value_text: string, value_binary: list<byte>, imports: list<ImportDescriptor>, depth: int)
  private marshalStream(): void {
    this.events = [];
    const currentContainer: IonEvent[] = [];
    const currentContainerIndex: number[] = [];
    for (
      let tid: IonType | null = this.reader.next();
      tid === IonTypes.STRUCT;
      tid = this.reader.next()
    ) {
      this.reader.stepIn();
      const tempEvent: IonEvent = this.marshalEvent();
      if (tempEvent.eventType === IonEventType.CONTAINER_START) {
        currentContainer.push(tempEvent);
        this.events.push(tempEvent);
        currentContainerIndex.push(this.events.length);
      } else if (tempEvent.eventType === IonEventType.CONTAINER_END) {
        this.endContainer(
          currentContainer.pop()!,
          currentContainerIndex.pop()!,
        );
      } else if (
        tempEvent.eventType === IonEventType.SCALAR ||
        tempEvent.eventType === IonEventType.STREAM_END
      ) {
        this.events.push(tempEvent);
      } else {
        throw new Error("Unexpected eventType: " + tempEvent.eventType);
      }
      this.reader.stepOut();
    }
  }

  private marshalEvent(): IonEvent {
    const currentEvent = {};
    for (let tid: IonType | null; (tid = this.reader.next()); ) {
      const fieldName = this.reader.fieldName();
      if (fieldName && currentEvent[fieldName] !== undefined) {
        throw new Error("Repeated event field: " + fieldName);
      }
      switch (fieldName) {
        case "event_type": {
          currentEvent[fieldName] = this.reader.stringValue();
          break;
        }

        case "ion_type": {
          currentEvent[fieldName] = this.parseIonType();
          break;
        }

        case "field_name": {
          currentEvent[
            fieldName
          ] = this.resolveFieldNameFromSerializedSymbolToken();
          break;
        }

        case "annotations": {
          currentEvent[fieldName] = this.parseAnnotations();
          break;
        }

        case "value_text": {
          let tempString: string = this.reader.stringValue()!;
          if (tempString.substr(0, 5) === "$ion_") {
            tempString = "$ion_user_value::" + tempString;
          }
          const tempReader: Reader = makeReader(tempString);
          tempReader.next();
          const tempValue = tempReader.value();
          currentEvent["isNull"] = tempReader.isNull();
          currentEvent[fieldName] = tempValue;
          break;
        }

        case "value_binary": {
          currentEvent[fieldName] = this.parseBinaryValue();
          break;
        }

        case "imports": {
          currentEvent[fieldName] = this.parseImports();
          break;
        }

        case "depth": {
          currentEvent[fieldName] = this.reader.numberValue();
          break;
        }

        default:
          throw new Error("Unexpected event field: " + fieldName);
      }
    }
    let eventType: IonEventType;
    switch (currentEvent["event_type"]) {
      case "CONTAINER_START":
        eventType = IonEventType.CONTAINER_START;
        break;
      case "STREAM_END":
        eventType = IonEventType.STREAM_END;
        break;
      case "CONTAINER_END":
        eventType = IonEventType.CONTAINER_END;
        break;
      case "SCALAR":
        eventType = IonEventType.SCALAR;
        break;
      case "SYMBOL_TABLE":
        throw new Error("Symbol tables unsupported");
    }
    const fieldname =
      currentEvent["field_name"] !== undefined
        ? currentEvent["field_name"]
        : null;
    if (!currentEvent["annotations"]) { currentEvent["annotations"] = []; }

    const textEvent = this.eventFactory.makeEvent(
      eventType!,
      currentEvent["ion_type"],
      fieldname,
      currentEvent["depth"],
      currentEvent["annotations"],
      currentEvent["isNull"],
      currentEvent["value_text"],
    );

    if (eventType! === IonEventType.SCALAR) {
      const binaryEvent = this.eventFactory.makeEvent(
        eventType,
        currentEvent["ion_type"],
        fieldname,
        currentEvent["depth"],
        currentEvent["annotations"],
        currentEvent["isNull"],
        currentEvent["value_binary"],
      );
      if (!textEvent.equals(binaryEvent)) {
        throw new Error(
          `Text event ${currentEvent["value_text"]} does not equal binary event ${currentEvent["value_binary"]}`,
        );
      }
    }
    return textEvent;
  }

  private parseIonType(): IonType {
    const input: string = this.reader.stringValue()!.toLowerCase();
    switch (input) {
      case "null": {
        return IonTypes.NULL;
      }
      case "bool": {
        return IonTypes.BOOL;
      }
      case "int": {
        return IonTypes.INT;
      }
      case "float": {
        return IonTypes.FLOAT;
      }
      case "decimal": {
        return IonTypes.DECIMAL;
      }
      case "timestamp": {
        return IonTypes.TIMESTAMP;
      }
      case "symbol": {
        return IonTypes.SYMBOL;
      }
      case "string": {
        return IonTypes.STRING;
      }
      case "clob": {
        return IonTypes.CLOB;
      }
      case "blob": {
        return IonTypes.BLOB;
      }
      case "list": {
        return IonTypes.LIST;
      }
      case "sexp": {
        return IonTypes.SEXP;
      }
      case "struct": {
        return IonTypes.STRUCT;
      }
      default: {
        throw new Error("i: " + input);
      }
    }
  }

  private parseAnnotations(): string[] {
    const annotations: string[] = [];
    if (this.reader.isNull()) {
      return annotations;
    } else {
      this.reader.stepIn();
      for (let tid; (tid = this.reader.next()); ) {
        if (tid == IonTypes.STRUCT) {
          this.reader.stepIn();
          const type = this.reader.next();
          if (this.reader.fieldName() == "text" && type == IonTypes.STRING) {
            const text = this.reader.stringValue();
            if (text !== null) {
              annotations.push(text!);
            }
          } else if (
            this.reader.fieldName() == "importLocation" &&
            type == IonTypes.INT
          ) {
            const symtab = defaultLocalSymbolTable();
            const symbol = symtab.getSymbolText(this.reader.numberValue()!);
            if (symbol === undefined || symbol === null) {
              throw new Error(
                "Unresolvable symbol ID, symboltokens unsupported.",
              );
            }
            annotations.push(symbol);
          }
          this.reader.stepOut();
        }
      }
      this.reader.stepOut();
      return annotations;
    }
  }

  private parseBinaryValue(): any {
    //convert list of ints to array of bytes and pass the currentBuffer to a binary reader, generate value from factory.
    //start with a null check
    if (this.reader.isNull()) { return null; }
    const numBuffer: number[] = [];
    this.reader.stepIn();
    let tid: IonType | null = this.reader.next();
    while (tid) {
      numBuffer.push(this.reader.numberValue()!);
      tid = this.reader.next();
    }
    this.reader.stepOut();
    const bufArray = new Uint8Array(numBuffer as ReaderOctetBuffer);
    const tempReader: Reader = new BinaryReader(new BinarySpan(bufArray));
    tempReader.next();
    return tempReader.value();
  }

  private parseImports(): any {
    //TODO needed for symboltoken support.
    return this.reader.value();
  }

  /** Parse the field name (Symbol Token) into text/symbol
   *  example: {event_type: SCALAR, ion_type: INT, field_name: {text:"foo"}, value_text: "1", value_binary: [0x21, 0x01], depth:1}
   *  for more information: https://github.com/amzn/ion-test-driver#symboltoken-1
   */
  private resolveFieldNameFromSerializedSymbolToken(): string | null {
    if (this.reader.isNull()) {
      return null;
    }
    this.reader.stepIn();
    const type = this.reader.next();
    if (this.reader.fieldName() == "text" && type == IonTypes.STRING) {
      const text = this.reader.stringValue();
      if (text !== null) {
        this.reader.stepOut();
        return text;
      }
    } else if (
      this.reader.fieldName() == "importLocation" &&
      type == IonTypes.INT
    ) {
      const symtab = defaultLocalSymbolTable();
      const symbol = symtab.getSymbolText(this.reader.numberValue()!);
      if (symbol === undefined || symbol === null) {
        throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
      }
      this.reader.stepOut();
      return symbol;
    }
    return null;
  }
}
