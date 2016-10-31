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

// test text span and number parser

"use strict";

var test_numbers_good, test_numbers_bad, test_special_numbers;

var test1 = function() {

  if (!ION) {
    throw "error - no ION in test_text_span_number_parser.js";
  }

  var vstr, ii, e, n = 0, p = new ION.ParserForNumbers();

  window.a_test = {
    value_set: "",
    idx: 0,
    value: "",
    image: "",
  };
  
  // test the good values first
  window.a_test.value_set = 'test_numbers_good';
  for (ii=0; ii<test_numbers_good.length; ii++) {
    var str = test_numbers_good[ii];
    
    window.a_test.idx = ii;
    window.a_test.value = str;
    window.a_test.image = "";
    
    var sp = ION.makeSpan(str);
    p.parse(sp);
    vstr = p.toString();
    
    window.a_test.image = vstr;
    n++;
 }

  // now test the bad values - all should fail
  window.a_test.value_set = 'test_number_bad';
  for (ii=0; ii<test_numbers_bad.length; ii++) {
    var str = test_numbers_bad[ii];
    
    window.a_test.idx = ii;
    window.a_test.value = str;
    window.a_test.image = "";
    
    var sp = ION.makeSpan(str);
    try {
      p.parse(sp);
      vstr = p.toString();
    }
    catch (e) {
      vstr = "error at offset "+sp.offset();
    }
    
    window.a_test.image = vstr;
    n++;
 }


  return "test1 - tested "+n+" values";
};


test_numbers_good = [
"40.123e1",

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
  
  "0000Tz",
  "9999Tz",
  "1234-01Tz",
  "1234-02-01Tz",
  "2345-02T12:59z",
  "2345-03T12:59z",
  "2345-04-01T22:59z",
  "2345-05-02T22:59z",
  "2345-04-01T22:00:01z",
  "2345-05-02T22:00:02.1z",
  
  "0000T+01",
  "9999T+01",
  "1234-01T+01",
  "1234-02-01T+01",
  "2345-02T12:59+01",
  "2345-03T12:59+01",
  "2345-04-01T22:59+01",
  "2345-05-02T22:59+01",
  "2345-04-01T22:00:01+01",
  "2345-05-02T22:00:02.1+01",

  "0000T-02",
  "9999T-02",
  "1234-01T-02",
  "1234-02-01T-02",
  "2345-02T12:59-02",
  "2345-03T12:59-02",
  "2345-04-01T22:59-02",
  "2345-05-02T22:59-02",
  "2345-04-01T22:00:01-02",
  "2345-05-02T22:00:02.1-02",

  "0000T+04:30",
  "9999T+04:30",
  "1234-01T+04:30",
  "1234-02-01T+04:30",
  "2345-02T12:59+04:30",
  "2345-03T12:59+04:30",
  "2345-04-01T22:59+04:30",
  "2345-05-02T22:59+04:30",
  "2345-04-01T22:00:01+04:30",
  "2345-05-02T22:00:02.1+04:30",

  "0000T-03:15",
  "9999T-03:15",
  "1234-01T-03:15",
  "1234-02-01T-03:15",
  "2345-02T12:59-03:15",
  "2345-03T12:59-03:15",
  "2345-04-01T22:59-03:15",
  "2345-05-02T22:59-03:15",
  "2345-04-01T22:00:01-03:15",
  "2345-05-02T22:00:02.1-03:15",
 
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
];


test_numbers_bad = [
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
  "2007-02-29T00:00Z",
  "2007-07-20T12:00Z:bc",
  "2007-07-20T12:00Z/bc",
];
test_special_numbers = [
  "nan",
  "+inf",
  "-inf"
];
























