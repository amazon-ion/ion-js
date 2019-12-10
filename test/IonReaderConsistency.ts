import {assert} from "chai";
import * as ion from "../src/Ion";
import {IonTypes} from "../src/IonTypes";
import {IonType} from "../src/Ion";

describe('IonReaderConsistency', () => {
    let writerTypes = [
        {name: 'Binary', instance: ion.makeBinaryWriter()},
        {name: 'Text',   instance: ion.makeTextWriter()},
        {name: 'Pretty', instance: ion.makePrettyWriter()},
    ];

    // regression test for https://github.com/amzn/ion-js/issues/514
    writerTypes.forEach(writerType => {
        let writer = writerType.instance;
        it('Reads annotations correctly from structs created by a ' + writerType.name + ' writer', () => {
            // writes the following values with the provided writer, sums the 'id' ints
            // within structs annotated with 'foo', and verifies the sum is 26:
            //
            //   foo::{ quantity: 7 }
            //   bar::{ name: "x", id: 1 }
            //   baz::{ items:["thing1", "thing2"] }
            //   foo::{ quantity: 19 }
            //   bar::{ name: "y", id: 8 }

            writer.setAnnotations(['foo']);
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName('quantity');
            writer.writeInt(7);
            writer.stepOut();

            writer.setAnnotations(['bar']);
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName('name');
            writer.writeString('x');
            writer.writeFieldName('id');
            writer.writeInt(1);
            writer.stepOut();

            writer.setAnnotations(['baz']);
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName('items');
            writer.stepIn(IonTypes.LIST);
            writer.writeString('thing1');
            writer.writeString('thing2');
            writer.stepOut();
            writer.stepOut();

            writer.setAnnotations(['foo']);
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName('quantity');
            writer.writeInt(19);
            writer.stepOut();

            writer.setAnnotations(['bar']);
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName('name');
            writer.writeString('y');
            writer.writeFieldName('id');
            writer.writeInt(8);
            writer.stepOut();

            writer.close();

            let reader = ion.makeReader(writer.getBytes());
            let sum = 0;
            let type: IonType | null;
            while (type = reader.next()) {
                if (type === IonTypes.STRUCT) {
                    let annotations = reader.annotations();
                    if (annotations.length > 0 && annotations[0] === 'foo') {
                        reader.stepIn();
                        while (type = reader.next()) {
                            if (reader.fieldName() === 'quantity') {
                                sum += reader.numberValue()!;
                                break;
                            }
                        }
                        reader.stepOut();
                    }
                }
            }

            assert.equal(sum, 26);
        });
    });
});

