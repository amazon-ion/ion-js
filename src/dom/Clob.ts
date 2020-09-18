import { IonTypes, Writer } from "../Ion";
import { Lob } from "./Lob";

/**
 * Represents a clob[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#clob
 */
export class Clob extends Lob(IonTypes.CLOB) {
  /**
   * Constructor.
   * @param bytes         Raw, unsigned bytes to represent as a clob.
   * @param annotations   An optional array of strings to associate with `bytes`.
   */
  constructor(bytes: Uint8Array, annotations: string[] = []) {
    super(bytes, annotations);
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeClob(this);
  }

  toJSON() {
    // Because the text encoding of the bytes stored in this Clob is unknown,
    // we write each byte out as a Unicode escape (e.g. 127 -> 0x7f -> \u007f)
    // unless it happens to fall within the ASCII range.
    // See the Ion cookbook's guide to down-converting to JSON for details:
    // http://amzn.github.io/ion-docs/guides/cookbook.html#down-converting-to-json
    let encodedText = "";
    for (let byte of this) {
      if (byte >= 32 && byte <= 126) {
        encodedText += String.fromCharCode(byte);
        continue;
      }
      let hex = byte.toString(16);
      if (hex.length == 1) {
        encodedText += "\\u000" + hex;
      } else {
        encodedText += "\\u00" + hex;
      }
    }
    return encodedText;
  }
}
