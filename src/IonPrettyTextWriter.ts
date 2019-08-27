/*
 * Copyright 2012-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */

import {State, TextWriter} from "./IonTextWriter";
import {Writeable} from "./IonWriteable";
import {CharCodes} from "./IonText";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {Reader} from "./IonReader";
import {_writeValues} from "./util";
import {Writer} from "./IonWriter";
type Serializer<T> = (value: T) => void;

/*
 * This class and functionality carry no guarantees of correctness or support.
 * Do not rely on this functionality for more than front end formatting.
 */
export class PrettyTextWriter extends TextWriter {
    private indentCount : number = 0;
    constructor(writeable: Writeable, private readonly indentSize : number = 2) { super(writeable);}

    private writePrettyValue() : void {
        if(!this.isTopLevel && this.currentContainer.containerType && this.currentContainer.containerType !== IonTypes.STRUCT){
            this.writePrettyIndent(0);
        }
    }
    private writePrettyNewLine(incrementValue: number) : void {
        this.indentCount = this.indentCount + incrementValue;
        if(this.indentSize && this.indentSize > 0){
            this.writeable.writeByte(CharCodes.LINE_FEED);
        }
    }
    private writePrettyIndent(incrementValue: number) : void {
        this.indentCount = this.indentCount + incrementValue;
        if(this.indentSize && this.indentSize > 0){
            for(var i = 0; i < (this.indentCount*this.indentSize); i++ ){
                this.writeable.writeByte(CharCodes.SPACE);
            }
        }
    }

    writeFieldName(fieldName: string) : void {
        if (this.currentContainer.containerType !== IonTypes.STRUCT) {
            throw new Error("Cannot write field name outside of a struct");
        }
        if (this.currentContainer.state !== State.STRUCT_FIELD) {
            throw new Error("Expecting a struct value");
        }

        if (!this.currentContainer.clean) {
            this.writeable.writeByte(CharCodes.COMMA);
            this.writePrettyNewLine(0);
        }

        this.writePrettyIndent(0);
        this.writeSymbolToken(fieldName);
        this.writeable.writeByte(CharCodes.COLON);

        this.currentContainer.state = State.VALUE;
    }

    writeNull(type: IonType, annotations?: string[]) : void {
        if (type === null || type === undefined || type.bid < 0 || type.bid > 13) {
            throw new Error(`Cannot write null for type ${type}`);
        }
        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        this.writeUtf8("null." + type.name);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    endContainer() : void {
        let currentContainer = this.containerContext.pop();
        if (!currentContainer || !currentContainer.containerType) {
            throw new Error("Can't step out when not in a container");
        } else if (currentContainer.containerType === IonTypes.STRUCT && currentContainer.state === State.VALUE) {
            throw new Error("Expecting a struct value");
        }

        if (!currentContainer.clean) {
            this.writePrettyNewLine(0);
        }
        this.writePrettyIndent(-1);
        switch (currentContainer.containerType) {
            case IonTypes.LIST:
                this.writeable.writeByte(CharCodes.RIGHT_BRACKET);
                break;
            case IonTypes.SEXP:
                this.writeable.writeByte(CharCodes.RIGHT_PARENTHESIS);
                break;
            case IonTypes.STRUCT:
                this.writeable.writeByte(CharCodes.RIGHT_BRACE);
                break;
            default :
                throw new Error("Unexpected container type");
        }
    }

    writeValue<T>(type: IonType, value: T, annotations: string[], serialize: Serializer<T>) {
        if (this.currentContainer.state === State.STRUCT_FIELD) throw new Error("Expecting a struct field");
        if (value === null || value === undefined) {
            this.writeNull(type, annotations);
            return;
        }

        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        serialize(value);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    writeContainer(type: IonType, openingCharacter: number, annotations?: string[], isNull?: boolean) : void {
        if (isNull) {
            this.writeNull(type, annotations);
            return;
        }
        if(this.currentContainer.containerType === IonTypes.STRUCT && this.currentContainer.state === State.VALUE){
            this.currentContainer.state = State.STRUCT_FIELD;
        }
        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        this.writeable.writeByte(openingCharacter);
        this.writePrettyNewLine(1);
        this.stepIn(type);
    }

    handleSeparator() : void {
        if (this.isTopLevel) {
            if (this.currentContainer.clean) {
                this.currentContainer.clean = false;
            } else {
                this.writeable.writeByte(CharCodes.LINE_FEED);
            }
        } else {
            if (this.currentContainer.clean) {
                this.currentContainer.clean = false;
            } else {
                switch (this.currentContainer.containerType) {
                    case IonTypes.LIST:
                        this.writeable.writeByte(CharCodes.COMMA);
                        this.writePrettyNewLine(0);
                        break;
                    case IonTypes.SEXP:
                        this.writeable.writeByte(CharCodes.SPACE);
                        this.writePrettyNewLine(0);
                        break;
                    default:
                    //no op
                }
            }
        }
    }

    writeValues(reader: Reader, writer: Writer): void {
        _writeValues(reader, this);
    }
}