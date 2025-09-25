// Test file for proper class method declarations
// These should be detected as function declarations

export class TestClass {
  // Public method - should be detected
  public methodOne() {
    return 'method one';
  }

  // Private method - should be detected
  private methodTwo() {
    return 'method two';
  }

  // Protected method - should be detected
  protected methodThree() {
    return 'method three';
  }

  // Static method - should be detected
  static methodFour() {
    return 'method four';
  }

  // Async method - should be detected
  async methodFive() {
    return 'method five';
  }

  // Method with arguments - should be detected and count arguments correctly
  methodSix(a: string, b: number) {
    return a + b;
  }

  // Method that makes calls - the method should be detected, but not the calls inside
  methodSeven() {
    // These are function calls, not declarations
    this.someOtherMethod();
    dispatch({ type: 'action' });
    useEffect(() => {});

    return 'method seven';
  }

  // Constructor - should be detected
  constructor(private config: any) {
    // This is a method call, not a declaration
    this.initialize();
  }

  // Getter - should be detected
  get value() {
    return this._value;
  }

  // Setter - should be detected
  set value(newValue: any) {
    this._value = newValue;
  }

  private _value: any;
}

// Function outside class - should be detected
export function outsideFunction() {
  // This creates an instance but doesn't declare methods
  const instance = new TestClass({});

  // This is a method call, not a declaration
  instance.methodOne();

  return instance;
}