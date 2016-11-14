namespace ION {
  export class IonType {
    bid: number;
    name: string;
    scalar: boolean;
    lob: boolean;
    num: boolean;
    container: boolean;

    constructor(bid: number, name: string, scalar: boolean, lob: boolean, num: boolean, container: boolean) {
      this.bid = bid;
      this.name = name;
      this.scalar = scalar;
      this.lob = lob;
      this.num = num;
      this.container = container;
    }
  }
}
