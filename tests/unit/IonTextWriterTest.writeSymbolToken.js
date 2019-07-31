define(
    function(require) {
        const registerSuite = require('intern!object');
        const assert = require('intern/chai!assert');
        const ion = require('dist/amd/es6/Ion');
        const iontext = require('dist/amd/es6/IonText');

        registerSuite({
            name: 'Text Writer.writeSymbolToken',

            false:  () => verifyQuotesAdded('false'),
            nan:    () => verifyQuotesAdded('nan'),
            null:   () => verifyQuotesAdded('null'),
            true:   () => verifyQuotesAdded('true'),
            '':     () => verifyQuotesAdded(''),
            ' ':    () => verifyQuotesAdded(' '),
            '1':    () => verifyQuotesAdded('1'),
            '1-2':  () => verifyQuotesAdded('1-2'),
            '1.2':  () => verifyQuotesAdded('1.2'),
            '-1.2': () => verifyQuotesAdded('-1.2'),
            '{}':   () => verifyQuotesAdded('{}'),
            '[]':   () => verifyQuotesAdded('[]'),
            '"':    () => verifyQuotesAdded('"'),
            "'":    () => verifyQuotesAdded("'"),
            $1:     () => verifyQuotesAdded('$1'),

            a:      () => verifyNoQuotes('a'),
            a_b:    () => verifyNoQuotes('a_b'),
            $a:     () => verifyNoQuotes('$a'),

            '+':    () => verifyQuoteBehavior('+', true, false),
        });

        function verifyQuotesAdded(s) { verifyQuoteBehavior(s, true) }
        function verifyNoQuotes(s)    { verifyQuoteBehavior(s, false) }
        function verifyQuoteBehavior(s, shouldQuote, shouldQuoteInSexp = true) {
            let writer = new ion.makeTextWriter();

            writer.writeSymbol(s);        // symbol

            writer.writeInt(5, [s]);      // annotation

            writer.writeStruct();
            writer.writeFieldName(s);     // fieldname
            writer.writeInt(5);
            writer.endContainer();

            writer.writeSexp();
            writer.writeSymbol(s);        // symbol in sexp (operators should not be quoted)
            writer.endContainer();

            writer.close();
            let actual = String.fromCharCode.apply(null, writer.getBytes());

            s = iontext.escape(s, iontext.SymbolEscapes);

            let expected = `${s}\n${s}::5\n{${s}:5}\n(${s})`;
            if (shouldQuote) {
                expected = `'${s}'\n'${s}'::5\n{'${s}':5}\n`;
                if (shouldQuoteInSexp) {
                    expected += `('${s}')`;
                } else {
                    expected += `(${s})`;
                }
            }
            assert.equal(actual, expected);
        }
    }
);

