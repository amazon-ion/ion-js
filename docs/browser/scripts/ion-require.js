
requirejs(["ion/Ion"], function(ionLib) {
 var writer = ionLib.makeTextWriter();
 writer.writeStruct();
 writer.writeFieldName('f1');
 writer.writeBoolean(true);
 writer.endContainer();
 writer.close();
 alert(String.fromCharCode.apply(null, writer.getBytes()));
   
 var ionData = '{ hello: "world" }'; 
 var ionReader = ionLib.makeReader(ionData); 

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
 
var ion = undefined;

function test(str) { 
    requirejs(["ion/Ion"], function(ionLib) {
        ion = ionLib;
    });
    
} 

