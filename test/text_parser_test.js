/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// tesx_parser_test.js: test text span and general text parser

// TODO:
//      test skip functionality
//      deeper checks on actual values returned
//      add base64 decoding where appropriate
//      add binary reader testing
//      check utf-8 character handling 

"use strict";

var test_one, tests_good, tests_bad, test_specials;

var prefix = function(p) {
  var ii = p.depth(), prefix = "";
  while (ii-->0) {
    prefix += " ";
  }
  return prefix;
};

var traverse = function(p) {
  var t, s, i = "";
  for (;;) {
    t = p.next();
    if (t === undefined) break;
    if (t.container) {
      p.stepIn();
      i += prefix(p) + "{" + "\n";
      i += prefix(p) + " ";
      i += traverse(p);
      i += prefix(p) + "}" + "\n";
      p.stepOut();
    }
    else {
      s = p.stringValue();
      i += prefix(p) + s;
    }
  }
  i += "!";
  return i
};

var load = function(parser) {
  return load_list(parser);
};

var load_list = function(parser) {
  var t, s, c, parent = [];
  for (;;) {
    t = parser.next();
    if (t === undefined) break;
    if (t.container) {
      parser.stepIn();
      if (t == ION.STRUCT) {
        c = load_struct(parser);
      }
      else {
        c = load_list(parser);
      }
      parser.stepOut();
      parent.push(c);
    }
    else {
      s = parser.stringValue();
      parent.push(s);
    }
  }
  return parent;  
};

var load_struct = function(parser) {
  var t, s, c, f, parent = {};
  for (;;) {
    t = parser.next();
    if (t === undefined) break;
    f = parser.fieldName();
    if (t.container) {
      parser.stepIn();
      if (t == ION.STRUCT) {
        c = load_struct(parser);
      }
      else {
        c = load_list(parser);
      }
      parser.stepOut();
      parent[f] = c;
    }
    else {
      s = parser.stringValue();
      parent[f] = s;
    }
  }
  return parent;  
};

var test1 = function() {

  if (!ION) {
    throw "error - no ION in test_text_span_number_parser.js";
  }

  var vstr, ii, e, passed, n = 0, p, str, sp, image;

  window.a_test = {
    value_set: "",
    idx: 0,
    value: "",
    image: "",
  };
  
  var run_good_tests = function() {
    // run test_one first to make debugging easier (it MUST
    // be a duplicate of some other test, otherwise add it
    // to the test suite
    window.a_test.value_set = 'test_one';
    str = test_one;
    window.a_test.idx = 0;
    window.a_test.value = str;
    window.a_test.image = "";

    sp = ION.makeSpan(str);
    p = new ION.TextReader(sp);
    image = load(p);
    vstr = str + " - passed as good, like it should";
    window.a_test.image = vstr;
    n++;
    
    // test the good values first
    window.a_test.value_set = 'test_numbers_good';
    for (ii=0; ii<tests_good.length; ii++) {
      str = tests_good[ii];
      
      window.a_test.idx = ii;
      window.a_test.value = str;
      window.a_test.image = "";
      
      sp = ION.makeSpan(str);
      p = new ION.TextReader(sp);
      image = traverse(p);
      vstr = str + " - passed as good, like it should";
      window.a_test.image = vstr;
      n++;
    }
  };
  run_good_tests();

  var run_bad_tests = function() {
    // now test the bad values - all should fail
    window.a_test.value_set = 'test_number_bad';
    for (ii=0; ii<tests_bad.length; ii++) {
      str = tests_bad[ii];
      
      window.a_test.idx = ii;
      window.a_test.value = str;
      window.a_test.image = "";
      
      sp = ION.makeSpan(str);
      passed = true;
      try {
        p = new ION.TextReader(sp);
        image = traverse(p);
        vstr = str + "\n-- passed as good! (when it's supposed to be bad)";
      }
      catch (e) {
        vstr = "error at offset "+sp.offset();
        passed = false;
      }
      if (passed) {
        ION.error(vstr);
      }
      window.a_test.image = vstr;
      n++;
    }
  };
  run_bad_tests();
      
  var run_special_tests = function() {
    // now test the "special" values
    window.a_test.value_set = 'test_specials';
    for (ii=0; ii<test_specials.length; ii++) {
      str = test_specials[ii];
      
      window.a_test.idx = ii;
      window.a_test.value = str;
      window.a_test.image = "";
      
      sp = ION.makeSpan(str);
      p = new ION.TextReader(sp);
      image = traverse(p);

      vstr = str + " - passed as good, like it should";
      window.a_test.image = vstr;
      n++;
   }
  };
  run_special_tests();
  
  return "test1 - tested "+n+" values";
};


tests_good = [
"['symbol']",

/*
[1, (2 3), [4, (5)]]
*/

  "0",
  "10",
  "13.0",
  "-14.0",
  
  "20e1",
  "21e-1",
  "22f1",
  "23f-1",
  "24d1",
  "26d-1",

  "30E1",
  "31E-1",
  "32F1",
  "33F-1",
  "34D1",
  "36D-1",

  "40.123e1",
  "41.1234e-1",
  "42.12345f1",
  "43.123456f-1",
  "44.1234567d1",
  "46.12345678d-1",

  "123456789012345",
  "-123456789012345",

  "123456789012345e2",
  "123456789012345e-2",
  "-123456789012345e2",
  "-123456789012345e-2",
  
  "123456789012345f3",
  "123456789012345f-3",
  "-123456789012345f3",
  "-123456789012345f-3",

  "123456789012345d4",
  "123456789012345d-4",
  "-123456789012345d4",
  "-123456789012345d-4",

  "0000T",
  "9999T",
  "1234-01",
  "1234-02-01",
  "1234-01T",
  "1234-02-01T",
  "2345-02T12:59",
  "2345-03T12:59",
  "2345-04-01T22:59",
  "2345-05-02T22:59",

  "2345-04-01T22:00:01",
  "2345-05-02T22:00:02.1",
  "2345-05-02T22:00:02.2",
  "2345-05-02T22:00:02.3",
  
  "2000-02-28T02:00",
  "2001-02-28T02:01",
  "2002-02-28T02:02",
  "2003-02-28T02:03",
  "2004-02-29T02:04",
  
  "0001T",
  "0001-01T",
  "0001-01-01",
  "0001-01-01T",
  "0001-01-01T00:00Z",
  "0001-01-01T00:00+00:00",
  "0001-01-01T00:00-00:00",
  "0001-01-01T00:00:00Z",
  "0001-01-01T00:00:00+00:00",
  "0001-01-01T00:00:00-00:00",
  "0001-01-01T00:00:00.0Z",
  "0001-01-01T00:00:00.0+00:00",
  "0001-01-01T00:00:00.0-00:00",
  "0001-01-01T00:00:00.00Z",
  "0001-01-01T00:00:00.000Z",
  "0001-01-01T00:00:00.0000Z",
  "0001-01-01T00:00:00.00000Z",
  "0001-01-01T00:00:00.00000+00:00",
  "0001-01-01T00:00:00.00000-00:00",
  "1970-01-01",
  "1970-01-01T",
  "2046-11-30T23:46Z",
  "2004-02-29T10:20Z",
  "1970-06-06T03:19+08:00",
  "1835-03-31T10:50-06:15",
  "0001-01-01T08:49:00Z",
  "0001-01-01T08:49:00+08:49",
  "0001-01-01T08:49:00-08:49",
  "1999-06-30T09:16:24.3Z",
  "6060-07-31T07:04:19.9Z",
  "1857-05-30T19:24:59.1+23:59",
  "0001-01-01T23:59:59.9-23:59",
  "2000-09-11T08:01:21.98Z",
  "2000-09-11T08:01:21.987Z",
  "2000-09-11T08:01:21.9876Z",
  "2000-09-11T08:01:21.98765Z",
  "2010-10-01T15:15:16.12345Z",
  "2001-08-01T19:19:49.00600+01:01",
  "2100-04-01T22:22:34.06060-10:10",

// Roll local offset forward and back over some boundaries

// end of a leap day
  "2008-02-29T23:59-00:01",
  "2008-03-01T00:00+00:01",

// end of a non-leap day
  "2009-02-28T23:59-00:01",
  "2009-03-01T00:00+00:01",

// end of month
  "2009-09-30T00:00-00:01",
  "2009-10-01T00:00+00:01",

// end of year
  "2009-12-31T23:59:59-00:01",
  "2010-01-01T00:00+00:01",
  "2010-01-01T00:00-00:01",

// The end of time...
  "9999T",
  "9999-12T",
  "9999-12-31",
  "9999-12-31T",
  "9999-12-31T23:59:59Z",
 
  "2.718281828459045",
  "2.718281828459045d0",
  "2.718281828459045d+0",
  "2.718281828459045d-0",
  "2718281828459045d-15",
  "27182818284590450000000000d-25",
  "0.000000027182818284590450000000000d+8",
  "0.000000027182818284590450000000000d8",
  "0.00000002718281828459045d+8",
  "0.00000002718281828459045d8",
  "-2.718281828459045",
  "-2.718281828459045d0",
  "-2.718281828459045d+0",
  "-2.718281828459045d-0",
  "-2718281828459045d-15",
  "-27182818284590450000000000d-25",
  "-0.000000027182818284590450000000000d+8",
  "-0.000000027182818284590450000000000d8",
  "-0.00000002718281828459045d+8",
  "-0.00000002718281828459045d8",
  "2.718281828459045D0",
  "2.718281828459045D+0",
  "2.718281828459045D-0",
  "2718281828459045D-15",
  "27182818284590450000000000D-25",
  "0.000000027182818284590450000000000D+8",
  "0.000000027182818284590450000000000D8",
  "0.00000002718281828459045D+8",
  "0.00000002718281828459045D8",
  "-2.718281828459045D0",
  "-2.718281828459045D+0",
  "-2.718281828459045D-0",
  "-2718281828459045D-15",
  "-27182818284590450000000000D-25",
  "-0.000000027182818284590450000000000D+8",
  "-0.000000027182818284590450000000000D8",
  "-0.00000002718281828459045D+8",
  "-0.00000002718281828459045D8",
  "123456.0",
  "123456d0",
  "123456d1",
  "123456d2",
  "123456d3",
  "123456d42",
  "123456d-0",
  "123456d-1",
  "123456d-2",
  "123456d-42",
  "0.123456",
  "1.23456",
  "12.3456",
  "123.456",
  "1234.56",
  "12345.6",
  "12345.60",
  "12345.600",
  "12300456.0",
  "123.00456",
  "1230.0456",
  "12300.456",
  "123.456d42",
  "123.456d+42",
  "123.456d-42",
  "77777.7d0007",
  "77777.7d-0007",
  "77777.7d+0007",
  "77777.7d00700",
  "77777.7d-00700",
  "77777.7d+00700",
  "-1.28",
  "0.",
  "0.d0",
  "0.D0",
  "0d0",
  "0D0",
  "0.0",
  "0d-0",
  "0D-0",
  "0d-42",
  "0D-313",
  "0d+103",
  "0D+99",
  "0D666",
  "0.0d99",
  "0.000d-87",
  "0.0000",
  "-0.",
  "-0d0",
  "-0D0",
  "-0.0",
  "-0d-0",
  "-0D-0",
  "-0d-42",
  "-0D-313",
  "-0d+103",
  "-0D+99",
  "-0D666",
  "-0.0d99",
  "-0.000d-87",
  "-0.0000",
  "2.2250738585072012e-308",
  "0.00022250738585072012e-304",
  "2.225073858507201200000e-308",
  "2.2250738585072012e-00308",
  "2.2250738585072012997800001e-308",
  "0e0",
  "0E0",
  "0.0e0",
  "0e-0",
  "0E-0",
  "0e-42",
  "0E-313",
  "0e+103",
  "0E+99",
  "0E666",
  "0.0e99",
  "0.000e-87",
  "0.0000E45",
  "-0e0",
  "-0E0",
  "-0.0e0",
  "-0e-0",
  "-0E-0",
  "-0e-42",
  "-0E-313",
  "-0e+103",
  "-0E+99",
  "-0E666",
  "-0.0e99",
  "-0.000e-87",
  "-0.0000E45",
  "123456.0e0",
  "123456e0",
  "123456e1",
  "123456e2",
  "123456e3",
  "123456e42",
  "123456e-0",
  "123456e-1",
  "123456e-2",
  "123456e-42",
  "0.123456e0",
  "1.23456e0",
  "12.3456e0",
  "123.456e0",
  "1234.56e0",
  "12345.6e0",
  "12345.60e0",
  "12345.600e0",
  "12300456.0e0",
  "123.00456e0",
  "1230.0456e0",
  "12300.456e0",
  "123.456e42",
  "123.456e+42",
  "123.456e-42",
  "77777.7e0007",
  "77777.7e-0007",
  "77777.7e+0007",
  "-128",
  "18173238162219679736857031944447898744767430095109316084451026048678348094928854458274167288816962557611640075817315237016025726423548207924331642028847993938530524659112028449811515920726159569583847554301932799584192974700038250645135419704389244690214111003505621818033044965879076306690914532152840279256440975668846810694285470204245958782248405612488959069641454132691581386219910938587286910894148564397155066367399697230287047229035630842240888106685623631032505806388903066971508775182055551847210338095961815021030725796281642316166745051164958432783938535334657296749823645911331793861360616240344479015948",
  "-0xFE95F4CFF19A8EE2EDBBEE30C7C0ACBB83BFC4C0A58E8B94BB6250AEEAF3DB8F41B0ACDBB94B990C518D96C5EE3C02E276E06E07570A2B6E5DEA9FE4FAC8475A84EFCA8A8432D6D463BF0CEB470B4AD9B3B0C80730492E5EE660BCA86932D933C471F178140C5256AFFE4EF5C0404D74B4B7776E77178B3281E1C5B65AD8866BCBAA6225C4E1C5B9624B19DCC6001AFC3535A3769C8E937B7E3F9073AB0053CC0FFEB34124D5D570749D0181F4D4DEDCED7D28F038247BEFA18CE02A3D1293DA637BB1AB6598BB6617A6A5CE0512C390236DBCA283ADF0291E6903FBD6819D4C5A8216C69E2083DA5B3FEFB0928B208345A39207C8461E38F793036146107559ADF2F40612D25F14D45D7E2780B45E2CF9B5790D91AAAF327AF3323E20242C2632A64725844F1D9E218AAB0D56EE99AE486034D7B3FBFC4DCE8C9CC2A793CE93AFFE81DEE7158DAD7F0623CE692C8ED0975DBEEF9A717A0B63F90AF4FEBC96785A6FF4E06B090A65D33C98932DF39F7C5B807956A19897E0C3463046DF2EB4DF624C7C43BEF48FAB381A857B9F5B6C1BDBD6B3270C107CD3BC1C41FE04E1DDAC69F14119DE961AF773285544F819F3951542F704B501FF0364BF54D14A86E19BEC39394C85A6B256C6233DA801A44F5DB98CCDD8D9BB6788C014216DD57CB64573333CEED5B5C72A4EE296E75B3E32ED69083675A6A8F6B8AC85DEAED88AD0A7",
  "0",
  "42",
  "2112",
  "-999",
  "-0",
  "987654321",
  "-123456789",
  "0x10",
  "0xff",
  "0xFF",
  "0xA",
  "0xAbCdEf",
  "0x123456789",
  "0x1234567890abcdef",
  "-0x1234567890ABCDEF",
  "0x0",
  "-0x0",
  "-0xFFFF",
  "0x00FF",
  "-0x00FF",
  "2008-02-29",
  "2008-02-29T",
  "2008-02-29T00:00Z",
  "2008-02-29T00:00:00Z",
  "2008-02-29T00:00:00.0000Z",
  "1",
  
// allNull.ion
  "null",
  "null.null",
  "null.bool",
  "null.int",
  "null.float",
  "null.decimal",
  "null.timestamp",
  "null.string",
  "null.symbol",
  "null.blob",
  "null.clob",
  "null.struct",
  "null.list",
  "null.sexp",
  
// blobs.ion
  "{{\n		YSBiIGMgZCBlIGYgZyBoIGkgaiBrIGwgbSBuIG8gcCBxIHIgcyB0IHUgdiB3IHggeSB6\n}}",
  "{{  QSB CIEM  gRC B F IEYg Ry BI IEk gSi BLIE w   gTS B OI       E8 g UC BRI FIgUy BU IF Ug ViB XI F gg WS B a}}",
  "{{MSAyIDMgNCA1IDYgNyA4IDkgMA\n==}}",
  "{{\n\n			LCAuIDsgLyBbICcgXSBcID0gLSAwIDkgOCA3IDYgNSA0IDMgMiAxIGAgfiAhIEAgIyAkICUgXiAmICogKCApIF8gKyB8IDogPCA+ID8=\n\n      }}",
  "{{OiBTIKUgTyAASb8=}}",
  "{{  //79/PsAAQIDBAU=  }}",
  "{{\nA\n R E\nZ H i\n w 3 P\nE h R Y 2\n d 1 f Y u\nO n K W x t\n c b M 0 9 /\nv 9 v 8 A\n}}",
  "  {{ T25lIEJpZyBGYXQgVGVzdCBCbG9iIEZvciBZb3VyIFBsZWFzdXJl }}",

// booleans.ion
  "true",
  "false",

//clobs.ion
  "{{\"a b c d e f g h i j k l m n o p q r s t u v w x y z\"}}",
  "{{\n        \"A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\"\n}}",
  "{{            \"1 2 3 4 5 6 7 8 9 0\"              }}",
  "{{   \", . ; / [ ' ] \\\\ = - 0 9 8 7 6 5 4 3 2 1 ` ~ ! @ # $ % ^ & * ( ) _ + | : < > ?\"\n\n}}",
  "{{                   \"\\0 \\a \\b \\t \\n \\f \\r \\v \\\" \\' \\? \\\\\\\\ \\/ \\0\\a\\b\\t\\n\\f\\r\\v\\\"\\'\\? \\\\\\\\\/\"}}",
  "{{\"\\x7f \\x66 \\x00 \\x5a\\x5b\\x00\\x1c\\x2d\\x3f\\xFf\"}}",
  "{{\"\\x7F \\x66 \\x00 \\x5A\\x5B\\x00\\x1C\\x2D\\x3F\\xfF\"}}",
  "{{'''Stuff to write on '''\n  '''multiple lines '''\n  '''if you want to'''}}",
  "{{\"\"}}",
  "{{''''''}}",
  "{{\n\"\"\n}}",
  "{{  '''concatenated'''  ''' from '''   '''a single line'''  }}",
  "{{ \"\"}}",
  "{{\n        '''a b c d e f g h i j k l m n o p q r s t u v w x y z '''\n        '''A B C D E F G H I J K L M N O P Q R S T U V W X Y Z '''\n        ''', . ; / [ ' ] \\\\ = - 0 9 8 7 6 5 4 3 2 1 ` ~ ! @ # $ % ^ & * ( ) _ + | : < > ? '''\n        '''\\0 \\a \\b \\t \\n \\f \\r \\v \\\" \\' \\? \\\\\\\\ \\/ \\0\\a\\b\\t\\n\\f\\r\\v\\\"\\'\\?\\\\\\\\/'''\n        '''\\x7f \\x66 \\x00 \\x5a\\x5b\\x00\\x1c\\x2d\\x3f'''\n        '''\\x7F \\x66 \\x00 \\x5A\\x5B\\x00\\x1C\\x2D\\x3F'''\n}}",
  "{{\'\'\'\\\nmulti-line string\nwith embedded\nnew line\ncharacters\\\n\'\'\'}}",

// empty.ion
  "",

//eolCommentCr.ion
  "\/* WARNING: This file uses CR (Mac OS 9) end-of-lines! *\/\r[\r  \/\/ Bad endline logic will miss this EOL and lose the closing bracket below.\r]",

//eolCommentCrLf.ion
  "/* WARNING: This file uses CRLF (DOS) end-of-lines! */\r\n[\r\n  // Bad endline logic will miss this EOL and lose the closing bracket below.\r\n]\r\n",

// fieldnameInf.ion
  "// Trap for ION-208\n\n{ inf : false }",

// quoted field names
  "{ 'false' : false }",
  "{ 'nan' : false }",
  "{ '+inf' : false }",
  "{ 'null' : false }",
  "{ 'null.int' : false }",
  "{ '+inf' : false }",
  "{ '+inf' : false }",

// float_zeros.ion
  "0e0",
  "0E0",
  "0.0e0",
  "0e-0",
  "0E-0",
  "0e-42",
  "0E-313",
  "0e+103",
  "0E+99",
  "0E666",
  "0.0e99",
  "0.000e-87",
  "0.0000E45",
  "-0e0",
  "-0E0",
  "-0.0e0",
  "-0e-0",
  "-0E-0",
  "-0e-42",
  "-0E-313",
  "-0e+103",
  "-0E+99",
  "-0E666",
  "-0.0e99",
  "-0.000e-87",
  "-0.0000E45",

// lists.ion
  "[1, 2, 3, 4, 5]",
  "[1,2,3,4,5]",
  "[1, [2, 3], [[[5]]]]",
  "[1, (2 3), [4, (5)]]",
  "[true, 3.4, 3d6, 2.3e8, \"string\", '''multi-''' '''string''', Symbol, 'qSymbol',\n    {{\"clob data\"}}, {{YmxvYiBkYXRh}}, 1970-06-06, null.struct]",
  "[{one:1}, 2, 3]",
  "[0xab]",
  "[symbol]",
  "[\"string\"]",
  "['symbol']",
  "[+inf]",

//message2.ion
  "contribution::{\n\n  submission_id:99999,\n\n  customer_id:1234,\n\n  sku:\"XXX\",\n\n  version:1,\n\n  marketplace_ids:[1],\n\n  offer_listings:[\n\n    {marketplace_id:1},\n\n  ],\n\n  product:{\n\n    one:[\n\n      {value:\"A\"},\n\n    ],\n\n    two:[\n\n      {value:\"A\"},\n\n      {value:\"B\"},\n\n    ],\n\n    three:[\n\n      {value:\"A\"},\n\n      {value:\"B\"},\n\n      {value:\"C\"},\n\n    ],\n\n  },\n\n}\n",

//multipleAnnotations.ion
  "annot1::annot2::value",

// nonNulls.ion
// None of these values should be null.
  "0",
  "0.0",
  "0d0",
  "0e0",
  "\"\"",
  "''''''",
  "{{}}",
  "{{\"\"}}",
  "[]",
  "()",
  "{}",

//operators.ion
// The complete list of operator characters.
    "(\n  !\n  #\n  %\n  &\n  *\n  +\n  -\n  .\n  /\n  ;\n  <\n  =\n  >\n  ?\n  @\n  ^\n  `\n  |\n  ~\n)",

//sexpAnnotatedQuotedOperator.ion
  "( '@'::23 )",

//sexps.ion
  "(this is a sexp list)\n(`~!@/%^&*-+=|;<>?. 3 -- - 4)\n(+ ++ +-+ -++ - -- --- -3 - 3 -- 3 --3 )\n('+' '++' '+-+' '-++' '-' '--' '---' -3 - 3 '--' 3 '--'3 )\n(& (% -[42, 3]+(2)-))\n((()))\n([])\n(null .timestamps)\n//(a_plus_plus_plus_operator::+++ a_3::3)\n//(a_plus_plus_plus_operator:: +++ a_3::3)\n",

//strings.ion
  "\"a b c d e f g h i j k l m n o p q r s t u v w x y z\"\n",
  "\"A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\"\n",
  "\"1 2 3 4 5 6 7 8 9 0\"\n",
  "\", . ; / [ ' ] \\\\ = - 0 9 8 7 6 5 4 3 2 1 ` ~ ! @ # $ % ^ & * ( ) _ + | : < > ?\"\n",
  "\"\\0 \\a \\b \\t \\n \\f \\r \\v \\\" \\' \\? \\\\\\\\ \\/ \\0\\a\\b\\t\\n\\f\\r\\v\\\"\\'\\?\\\\\\\\\\/\"\n",
  "\"\\uaa5f\"\n",
  "\"\\uabcd \\ud7ff \\uffff \\u1234 \\u4e6a \\ud37b\\uf4c2\\u0000\\x00\\xff\"  // d7ff was deff\n",
  "\"\\uABCD \\uD7FF \\uFFFF \\u1234 \\u4E6A \\uD37B\\uF4C2\\u0000\\x00\\xff\"\n",
  "\"\\uaBcD \\uD7ff \\uFffF \\u1234 \\u4E6a \\ud37B\\uF4c2\\u0000\\x00\\xff\"\n",
  "'''Stuff to write on '''\n'''multiple lines '''\n'''if you want to'''\n\"\"\n",
  "''''''\n",
  "\"\"\n",
  "'''concatenated'''  ''' from '''   '''a single line'''\n",
  "\"\"\n",
  "'''a b c d e f g h i j k l m n o p q r s t u v w x y z '''\n'''A B C D E F G H I J K L M N O P Q R S T U V W X Y Z '''\n",
  "''', . ; / [ ' ] \\\\ = - 0 9 8 7 6 5 4 3 2 1 ` ~ ! @ # $ % ^ & * ( ) _ + | : < > ? '''\n",
  "'''\\0 \\a \\b \\t \\n \\f \\r \\v \\\" \\' \\? \\\\\\\\ \\/ \\0\\a\\b\\t\\n\\f\\r\\v\\\"\\'\\?\\\\\\\\\\/'''\n",
  "'''\\uabcd \\ud7ff \\uffff \\u1234 \\u4e6a \\ud37b\\uf4c2\\u0000\\x00\\xff'''\n",
  "'''\\uABCD \\uD7FF \\uFFFF \\u1234 \\u4E6A \\uD37B\\uF4C2\\u0000\\x00\\xFF'''\n",
  "'''\\uaBcD \\uD7ff \\uFffF \\u1234 \\u4E6a \\ud37B\\uF4c2\\u0000\\x00\\xfF''' // d7ff was deff\n",
  "\"\"\n",
  "'''\\nmulti-line string\nwith embedded\nnew line\ncharacters\\n'''",

//

//

//

//

//

//

//
];


tests_bad = [
  "+11",
  "+12",

  "0d0-3",
  "0d-3-4",
  "3.4d3-3",
  "3.4+43.4+43.4+43.4+4",
  "04.3",
  "007d4",
  "00d0",
  "+123d0",
  "0.3-4",
  "0.3.4",
  "0d.3",
  "3.4.4-3",
  "3.4d4.3",
  "3.4dd4",
  "3.4a",
  "+1",
  "007",
  "1247:bc",
  "1247/bc",
  "0e0-3",
  "0e-3-4",
  "3.4e3-3",
  "0e.3",
  "3.4.4-3",
  "3.4e4.3",
  "3.4ee4",
  "3.4ea",
  "03.4e0",
  "003e4",
  "00e0",
  "+123e0",
  "0x3�",
  "12a",
  "1-2",
  "1+2",
  "0xfg",
  "0xax",
  "007",
  "01",
//   "-1",
  "-;",
// We don't check this detail yet:  "2007-02-29T00:00Z",
  "2007-07-20T12:00Z:bc",
  "2007-07-20T12:00Z/bc",
];

test_specials = [
  "nan",
  "+inf",
  "-inf"
];

test_one = "[ 1970-06-06, null.struct]";

/*  
"contribution::{\n\n  submission_id:54321,\n\n  customer_id:1234,\n\n  sku:\"XXX\",\n\n  version:1,\n\n  marketplace_ids:[1],\n\n  offer_listings:[\n\n    {marketplace_id:1},\n\n  ],\n\n  product:{\n\n    one:[\n\n      {value:\"A\"},\n\n    ],\n\n    two:[\n\n      {value:\"A\"},\n\n      {value:\"B\"},\n\n    ],\n\n    three:[\n\n      {value:\"A\"},\n\n      {value:\"B\"},\n\n      {value:\"C\"},\n\n    ],\n\n  },\n\n}\n";
  
contribution::{
  submission_id:54321,
  customer_id:1234,
  sku:"XXX",
  version:1,
  marketplace_ids:[1],
  offer_listings:[
    {marketplace_id:1},
  ],
  product:{
    one:  [ {value:"A"}, ],
    two:  [ {value:"A"}, {value:"B"}, ],
    three:[ {value:"A"}, {value:"B"}, {value:"C"}, ],
  },
}
*/
  
/*
contribution::{nn  submission_id:99999,nn  customer_id:1234,nn  sku:"XXX",nn  version:1,nn  marketplace_ids:[1],nn  offer_listings:[nn    {marketplace_id:1},nn  ],nn  product:{nn    one:[nn      {value:"A"},nn    ],nn    two:[nn      {value:"A"},nn      {value:"B"},nn    ],nn    three:[nn      {value:"A"},nn      {value:"B"},nn      {value:"C"},nn    ],nn  },nn}n";
*/
;