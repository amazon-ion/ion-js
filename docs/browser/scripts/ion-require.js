requirejs(["ion/Ion"], function(ion) {
 var writer = ion.makeTextWriter();
 writer.writeStruct();
 writer.writeFieldName('f1');
 writer.writeBoolean(true);
 writer.endContainer();
 writer.close();
 alert(String.fromCharCode.apply(null, writer.getBytes()));
   
 var ionData = '{ hello: "world" }'; 
 var ionReader = ion.makeReader(ionData); 

 console.log('ionData : ', ionData);
 console.log('ionReader : ', ionReader);
 
 ionReader.next(); 
 ionReader.stepIn(); 
 ionReader.next(); 
 var hello = ionReader.fieldName(); 
 var world = ionReader.stringValue(); 
 ionReader.stepOut(); 
 console.log(hello, '...', world);

 
});
 
function test(str) { 
    console.log(str); 
} 
