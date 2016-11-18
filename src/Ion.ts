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
namespace ION {
  const e = {
    name: "IonError",
    where: undefined,
    msg: "error",
  }

  function get_buf_type(buf) {
    var b1, btype = typeof buf;
    if (btype === 'undefined' || typeof buf.length === 'undefined') this.error("invalid input");
    if (btype === 'string') {
      b1 = buf.charCodeAt(0);
    }
    else if (btype === 'object') { //probably array, object with length
      b1 = buf[0];
    }
    else {
      this.error("invalid input");
    }
    return (b1 === IVM.binary[0]) ? 'binary' : 'text';
  }

  function makeBinaryReader(buf, options) : BinaryReader {
    var span = makeSpan(buf);
    var parser = new BinaryReader(span, options && options.catalog);
    return parser;
  }

  function makeTextReader(buf, options) : TextReader {
    var span = makeSpan(buf);
    var parser = new TextReader(span, options && options.catalog);
    return parser;
  }

  function makeReader( buf: Span, options: any ) : Reader {
    var stype =  options && (typeof options.sourceType === 'undefined') 
                  ? options.sourceType 
                  : get_buf_type(buf);
    var reader = (stype === 'binary') 
               ? makeBinaryReader(buf, options) 
               : makeTextReader(buf, options);
    return reader;
  }
}
