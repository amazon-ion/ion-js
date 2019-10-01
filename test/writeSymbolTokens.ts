import {assert} from 'chai';
import * as ion from '../src/Ion';
import * as IonText from '../src/IonText';

function verifyQuoteBehavior(symbolText: string, shouldQuote: boolean, shouldQuoteInSexp = true) {
    let writer = ion.makeTextWriter();

    writer.writeSymbol(symbolText);        // symbol

    writer.setAnnotations([symbolText]);
    writer.writeInt(5);      // annotation

    writer.stepIn(ion.IonTypes.STRUCT);
    writer.writeFieldName(symbolText);     // fieldname
    writer.writeInt(5);
    writer.stepOut();

    writer.stepIn(ion.IonTypes.SEXP);
    writer.writeSymbol(symbolText);        // symbol in sexp (operators should not be quoted)
    writer.stepOut();

    writer.close();
    let actual = String.fromCharCode.apply(null, writer.getBytes());

    symbolText = IonText.escape(symbolText, IonText.SymbolEscapes);

    let expected = `${symbolText}\n${symbolText}::5\n{${symbolText}:5}\n(${symbolText})`;
    if (shouldQuote) {
        expected = `'${symbolText}'\n'${symbolText}'::5\n{'${symbolText}':5}\n`;
        if (shouldQuoteInSexp) {
            expected += `('${symbolText}')`;
        } else {
            expected += `(${symbolText})`;
        }
    }
    assert.equal(actual, expected);
}

function verifyQuotesAdded(symbolText: string) {
    verifyQuoteBehavior(symbolText, true)
}

function verifyNoQuotes(symbolText: string) {
    verifyQuoteBehavior(symbolText, false)
}

let symbolsThatNeedQuotes = [
    'false',
    'nan',
    'null',
    'true',
    '+inf',
    '-inf',
    '',
    ' ',
    '1',
    '1-2',
    '1.2',
    '-1.2',
    '{}',
    '[]',
    '"',
    "'",
    '$1',
];

let symbolsThatDoNotNeedQuotes = [
    'a',
    'a_b',
    '$a',
];

describe('Writing text symbol tokens', () => {
    describe('Symbols that need quotes', () => {
        for (let symbol of symbolsThatNeedQuotes) {
            it(symbol, () => verifyQuotesAdded(symbol));
        }
    });
    describe("Symbols that don't need quotes", () => {
        for (let symbol of symbolsThatDoNotNeedQuotes) {
            it(symbol, () => verifyNoQuotes(symbol));
        }
    });
    it('Symbols that need quotes outside of an S-Expression', () => verifyQuoteBehavior('+', true, false))
});