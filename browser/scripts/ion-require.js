requirejs(["Ion"], function(ion) {
  var symbolTable = new ion.LocalSymbolTable(ion.getSystemSymbolTableImport());
  var writeable = new ion.Writeable();
  var writer = new ion.BinaryWriter(symbolTable, writeable);
  writer.writeStruct();
  writer.close();
  var actual = writeable.getBytes();
  alert(actual);
});
