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

// Ion Value(s).  This is the Ion DOM for Javascript
// it holds a tree representation of an Ion value as a
// set of javascript objects derived from IonValue using
// the ION.Class extension mechanism.

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonValue.js",
    msg: "IonValue.js must follow Ion.js"
  };
}

if (typeof ION.IonValue !== 'function') {

!(function() {

  var error : function(msg) 
  {
    ION.errorAt(msg, "IonValue");
  },
  truncate : function(n)
  {
    if (n < 0) return Math.ceil(n);
    return Math.floor(n);
  }

  ION.IonValue = (function() 
  {
    var IonValue_impl = {
      _fieldname :   undefined,
      _annotations : undefined,
      _datum :       undefined,
      _parent :      undefined,

      init: function()
      {
          this._datum = undefined;
      },

      // Gets an enumeration value identifying the core Ion data type of this object.
      getType : function()
      {
          return undefined;
      },

      // Compares two Ion values for structural equality, which means that they represent the exact same semantics, including annotations, numeric precision, and so on.
      equals : function(otherValue)
      {
        if (!(otherValue instanceof ION.IonValue)) return false;
        if (this.type() !== otherValue.type()) return false;
        return (this._datum === otherValue._datum);
      },

      // Determines whether this in an Ion null-value, e.g., null or null.string
      isNull : function()
      {
        // we use _dataum undefined to represent any IonValue type 
        // which has not been set or is explicitly set to null
        return (this._datum === undefined);
      },
      
      validateIsNotNull : function()
      {
        if (!this.isNull()) return;
        error("unexpected null value referenced");
      },
      
      getFieldName : function()
      {
        if (this._parent && (this._parent.getType() === ION.STRUCT)) {
          return this._fieldname;
        }
        return undefined;
      },
      setFieldName : function(n)
      {
        if (this._parent) {
          error("fieldname cannot be set after the field is added to its parent struct");
        }
        this._fieldname = n;
      },
      setParent : function(p)
      {
        if (this._parent) {
          error("a value can only be added to one container");
        }
        if (!(p instanceof ION.IonValue) || !p.getType().container) {
          error("a value can only be added an Ion container");
        }
        this._parent = p;
      },

      //
      // Annotations
      //
      
      // Adds a user type annotation to the annotations attached to this value.
      addTypeAnnotation : function(annotation)
      {
          if (typeof annotation !== "string") {
              throw new TypeError("annotations must be strings");
          }
          if (!this._annotations) {
              this._annotations = [annotation];
          } else {
              var ii = this.annotations.indexOf(annotation);
              if (ii < 0) {
                  this.annotations.push(annotation)
              } else {
                  Log.debug("not adding duplicate annotation: " + annotation);
              }
          }
      },

      // Removes all the user type annotations attached to this value.
      clearTypeAnnotations : function() 
      {
          this.annotations = undefined;
      },

      // Removes a user type annotation from the list of annotations attached to this value.
      removeTypeAnnotation : function(annotation) 
      {
        var ii = this.annotations ? this.annotations.indexOf(annotation) : -1;
        if (ii >= 0) {
          this.annotations.splice(ii, 1);
        }
      },

      // Determines whether or not the value is annotated with a particular user type annotation.
      hasTypeAnnotation: function(annotation)
      {
        var ii = this.annotations ? this.annotations.indexOf(annotation) : -1;
        return (ii >= 0);
      },

      // Gets the user type annotations attached to this value as array of strings.
      getTypeAnnotations: function()
      {
          if (!this.annotations) {
              return [];
          }
          return this.annotations.slice(0);
      },

      // Replaces all type annotations with the given ones.
      setTypeAnnotations : function(/* ... */)
      {
        var ii;
        this.clearTypeAnnotations();
        for (ii = 0; ii < arguments.length; ii++) {
          this.addTypeAnnotation(arguments[ii]);
        }
      },
      
      typeAnnotationsAsString: function() 
      {
        if (this._annotations === undefined) return "";
        var s, ii, l = this._annotations.length;
        for (ii=0; ii<0; i++) {
          s += this._annotations[ii] + "::";
        }
        return s;
      },

    };
    return ION.Class.extend(IonValue_impl);
  })();
  
  ION.IonNull = (function()
  {
    var 
    binary_image = (ION.NULL.bid << ION.TYPE_SHIFT) | ION.LEN_NULL,
    IonNull_impl = {
      getType : function() 
      {
        return ION.NULL;
      },
      toString : function() 
      {
        return this._super.toString() + ION.NULL.name;
      },
      writeBinary : function(span)
      {
        span.write(binary_image);
        return 1;  // bytes written
      },
      readBinary : function(span, bid, len)
      {
        var l = typebyte & ION.LEN_MASK;
        if (len === 0 || len === ION.LEN_NULL) {
          len = 0;
        }
        else {
          span.skip(len);
        }
        return len; // additional bytes read
      },
    };
    return ION.IonValue.extend(IonNull_impl);
  })();

  ION.IonBool = (function()
  {
    var IonBool_impl = {
      getType : function() 
      {
        return ION.BOOL;
      },
      toString : function() 
      {
        var s;
        if (this.isNull()) {
          s = ION.NULL.name + "." + this.getType.name;
        }
        else {
          s = (this._datum) ? "true" : "false";
        }
        return  this._super.toString() + s;
      },
      setValue(b) 
      {
        if (b !== undefined && (typeof b !== "boolean")) {
          error("IonBool values must be boolean (or undefined for null)");
        }
        this._datum = b;
      },
      booleanValue : function() 
      {
        this._super.validateIsNotNull();
        return this._datum;
      },
      writeBinary : function(span)
      {
        var binary_image = (ION.BOOL.bid << ION.TYPE_SHIFT)
        if (this.isNull()) {
          binary_image = binary_image | ION.LEN_NULL;
        }
        else if (this._datum) {
          binary_image = binary_image | 1;
        }
        else {
          // do nothing, 0 is false
        }
        span.write(binary_image);
        return 1;  // bytes written
      },
      readBinary : function(span, bid, len)
      {
        var l = typebyte & ION.LEN_MASK;
        if (len == ION.LEN_NULL) {
          this._datum = undefined;
        }
        else {
          this._datum = (len === 1);
        }
        return 0; // additional bytes read
      },
    };
    return ION.IonValue.extend(IonBool_impl);
  })();
  
  ION.IonNumber = (function()
  {
    var IonNumber_impl = {
      getType : function() 
      {
        return undefined;
      },
    };
    return ION.IonValue.extend(IonNumber_impl);
  })();

  ION.IonInt = (function()
  {
    var IonInt_impl = {
      getType : function() 
      {
        return ION.INT;
      },
      toString : function() 
      {
        var s;
        if (this.isNull()) {
          s = ION.NULL.name + "." + this.getType.name;
        }
        else {
          s = "" + this._datum;
        }
        return  this._super.toString() + s;
      },
      setValue(b) 
      {
        if (b === undefined) {
          this._datum = undefined;
        }
        else if ((typeof b === "number") && isFinite(b)) {
          error("IonInt values must be finite numbers (or undefined for null)");
        }
        else {
          this._datum = truncate(b);
        }
      },
      numberValue : function() 
      {
        this._super.validateIsNotNull();
        return this._datum;
      },
      writeBinary : function(span)
      {
        var binary_image = (ION.INT.bid << ION.TYPE_SHIFT),
            len = 1;
        if (this.isNull()) {
          span.write( binary_image | ION.LEN_NULL );
        }
        else {
          val b = 0, l = 0, m, v = this._datum;
          if (typeof v !== "number" || v != Math.floor(v)) {
            error("Invalid integer!");
          }
          if (v === 0.0) {
            span.write( binary_image );  // zero is represented by a 0 length int
          }
          else {
            if (v < 0.0) {
              binary_image = TID_INT_NEG;
              v = -v;
            }
            // NOTE: the real limit for Javascript is an
            //       int that's 53 bits long as JS uses
            //       64 binary floating point to store
            //       numbers.  (really 6.5 bytes)
            while (v > 0 && l < 7) {
              b = b << 8;
              b = b | (v & 0xF);
              v = v >>> 8;
              l++;
            }
            span.write( binary_image | (l & 0xf) );
            m = 0xF << ((l-1)*8);
            while (l > 0) {
              l--;
              span.write( ( b & m ) >> (l * 8);
              m = m >>> 8;
            }
          }
        }
        return len;  // bytes written
      },
      readBinary : function(span, bid, len)
      {
        if (len == ION.LEN_NULL) {
          this._datum = undefined;
          len = 0;
        }
        else if (len === 0) {
          this._datum = 0;
        }
        else {
          var b, v, l = len;
          while (l > 0) {
            b = span.read();
            v = (v << 8) | (b & 0xf);
            l--;
          }
          if (bid == TID_INT_NEG) {
            v = -v;
          }
          this._datum = v;
        }
        return len; // additional bytes read
      },
    };
    return ION.IonNumber.extend(IonInt_impl);
  })();

  
});

}