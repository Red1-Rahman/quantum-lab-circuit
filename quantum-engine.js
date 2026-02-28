class Complex {
  constructor(real = 0, imag = 0) {
    this.real = real;
    this.imag = imag;
  }

  static fromPolar(magnitude, phase) {
    return new Complex(
      magnitude * Math.cos(phase),
      magnitude * Math.sin(phase),
    );
  }

  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }

  subtract(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }

  multiply(other) {
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real,
    );
  }

  scale(scalar) {
    return new Complex(this.real * scalar, this.imag * scalar);
  }

  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  magnitude() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  phase() {
    return Math.atan2(this.imag, this.real);
  }

  probability() {
    return this.real * this.real + this.imag * this.imag;
  }

  toString(precision = 3) {
    const r = this.real.toFixed(precision);
    const i = Math.abs(this.imag).toFixed(precision);
    if (Math.abs(this.imag) < 0.0001) return r;
    if (Math.abs(this.real) < 0.0001)
      return `${this.imag >= 0 ? "" : "-"}${i}i`;
    return `${r} ${this.imag >= 0 ? "+" : "-"} ${i}i`;
  }
}

const QuantumGates = {
  I: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), new Complex(1)],
  ],

  X: [
    [new Complex(0), new Complex(1)],
    [new Complex(1), new Complex(0)],
  ],

  Y: [
    [new Complex(0), new Complex(0, -1)],
    [new Complex(0, 1), new Complex(0)],
  ],

  Z: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), new Complex(-1)],
  ],

  H: [
    [new Complex(1 / Math.sqrt(2)), new Complex(1 / Math.sqrt(2))],
    [new Complex(1 / Math.sqrt(2)), new Complex(-1 / Math.sqrt(2))],
  ],

  S: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), new Complex(0, 1)],
  ],

  Sdg: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), new Complex(0, -1)],
  ],

  T: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), Complex.fromPolar(1, Math.PI / 4)],
  ],

  Tdg: [
    [new Complex(1), new Complex(0)],
    [new Complex(0), Complex.fromPolar(1, -Math.PI / 4)],
  ],

  Rx: (theta) => [
    [new Complex(Math.cos(theta / 2)), new Complex(0, -Math.sin(theta / 2))],
    [new Complex(0, -Math.sin(theta / 2)), new Complex(Math.cos(theta / 2))],
  ],

  Ry: (theta) => [
    [new Complex(Math.cos(theta / 2)), new Complex(-Math.sin(theta / 2))],
    [new Complex(Math.sin(theta / 2)), new Complex(Math.cos(theta / 2))],
  ],

  Rz: (theta) => [
    [Complex.fromPolar(1, -theta / 2), new Complex(0)],
    [new Complex(0), Complex.fromPolar(1, theta / 2)],
  ],

  P: (phi) => [
    [new Complex(1), new Complex(0)],
    [new Complex(0), Complex.fromPolar(1, phi)],
  ],

  SX: [
    [new Complex(0.5, 0.5), new Complex(0.5, -0.5)],
    [new Complex(0.5, -0.5), new Complex(0.5, 0.5)],
  ],
};

const MultiQubitGates = {
  CNOT: "CNOT",
  CZ: "CZ",
  CY: "CY",
  SWAP: "SWAP",
  Toffoli: "Toffoli",
  Fredkin: "Fredkin",
  iSWAP: "iSWAP",
  sqrtSWAP: "sqrtSWAP",
};

class QuantumState {
  constructor(numQubits) {
    this.numQubits = numQubits;
    this.numStates = 1 << numQubits;
    this.amplitudes = new Array(this.numStates)
      .fill(null)
      .map(() => new Complex(0));
    this.amplitudes[0] = new Complex(1);
  }

  reset() {
    this.amplitudes = new Array(this.numStates)
      .fill(null)
      .map(() => new Complex(0));
    this.amplitudes[0] = new Complex(1);
  }

  clone() {
    const newState = new QuantumState(this.numQubits);
    newState.amplitudes = this.amplitudes.map(
      (a) => new Complex(a.real, a.imag),
    );
    return newState;
  }

  getAmplitude(index) {
    return this.amplitudes[index];
  }

  getProbability(index) {
    return this.amplitudes[index].probability();
  }

  getProbabilities() {
    return this.amplitudes.map((a) => a.probability());
  }

  normalize() {
    let norm = 0;
    for (const amp of this.amplitudes) {
      norm += amp.probability();
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.numStates; i++) {
        this.amplitudes[i] = this.amplitudes[i].scale(1 / norm);
      }
    }
  }

  measure(qubit) {
    let prob0 = 0;
    for (let i = 0; i < this.numStates; i++) {
      if (((i >> qubit) & 1) === 0) {
        prob0 += this.amplitudes[i].probability();
      }
    }

    const outcome = Math.random() < prob0 ? 0 : 1;

    const norm = Math.sqrt(outcome === 0 ? prob0 : 1 - prob0);
    for (let i = 0; i < this.numStates; i++) {
      if (((i >> qubit) & 1) !== outcome) {
        this.amplitudes[i] = new Complex(0);
      } else {
        this.amplitudes[i] = this.amplitudes[i].scale(1 / norm);
      }
    }

    return outcome;
  }

  measureAll() {
    const probs = this.getProbabilities();
    let cumProb = 0;
    const r = Math.random();

    for (let i = 0; i < this.numStates; i++) {
      cumProb += probs[i];
      if (r < cumProb) {
        this.amplitudes = new Array(this.numStates)
          .fill(null)
          .map(() => new Complex(0));
        this.amplitudes[i] = new Complex(1);
        return i;
      }
    }

    return this.numStates - 1;
  }

  toBinaryString(index) {
    return index.toString(2).padStart(this.numQubits, "0");
  }

  toKetNotation(index) {
    return `|${this.toBinaryString(index)}⟩`;
  }

  toString() {
    let result = [];
    for (let i = 0; i < this.numStates; i++) {
      const amp = this.amplitudes[i];
      if (amp.probability() > 0.0001) {
        result.push(`${amp.toString()} ${this.toKetNotation(i)}`);
      }
    }
    return result.join(" + ") || "0";
  }
}

class QuantumCircuit {
  constructor(numQubits = 3) {
    this.numQubits = numQubits;
    this.gates = [];
    this.state = new QuantumState(numQubits);
  }

  reset() {
    this.gates = [];
    this.state.reset();
  }

  addQubit() {
    if (this.numQubits < 10) {
      this.numQubits++;
      this.state = new QuantumState(this.numQubits);
    }
  }

  removeQubit() {
    if (this.numQubits > 1) {
      this.numQubits--;
      this.state = new QuantumState(this.numQubits);
      this.gates = this.gates.filter((g) => {
        if (g.target >= this.numQubits) return false;
        if (g.control !== undefined && g.control >= this.numQubits)
          return false;
        if (g.control2 !== undefined && g.control2 >= this.numQubits)
          return false;
        return true;
      });
    }
  }

  addGate(gateName, target, control = null, control2 = null, params = null) {
    const gate = {
      name: gateName,
      target: target,
      control: control,
      control2: control2,
      params: params,
      time: this.gates.length,
    };
    this.gates.push(gate);
    return gate;
  }

  removeGate(index) {
    if (index >= 0 && index < this.gates.length) {
      this.gates.splice(index, 1);
    }
  }

  applySingleQubitGate(gate, qubit) {
    const newAmplitudes = new Array(this.state.numStates)
      .fill(null)
      .map(() => new Complex(0));

    for (let i = 0; i < this.state.numStates; i++) {
      const bit = (i >> qubit) & 1;
      const i0 = i & ~(1 << qubit);
      const i1 = i | (1 << qubit);

      if (bit === 0) {
        newAmplitudes[i0] = newAmplitudes[i0].add(
          gate[0][0]
            .multiply(this.state.amplitudes[i0])
            .add(gate[0][1].multiply(this.state.amplitudes[i1])),
        );
        newAmplitudes[i1] = newAmplitudes[i1].add(
          gate[1][0]
            .multiply(this.state.amplitudes[i0])
            .add(gate[1][1].multiply(this.state.amplitudes[i1])),
        );
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  applyCNOT(control, target) {
    const newAmplitudes = [...this.state.amplitudes];

    for (let i = 0; i < this.state.numStates; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const j = i ^ (1 << target);
        if (i < j) {
          [newAmplitudes[i], newAmplitudes[j]] = [
            newAmplitudes[j],
            newAmplitudes[i],
          ];
        }
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  applyCZ(control, target) {
    for (let i = 0; i < this.state.numStates; i++) {
      const controlBit = (i >> control) & 1;
      const targetBit = (i >> target) & 1;
      if (controlBit === 1 && targetBit === 1) {
        this.state.amplitudes[i] = this.state.amplitudes[i].scale(-1);
      }
    }
  }

  applyCY(control, target) {
    const newAmplitudes = [
      ...this.state.amplitudes.map((a) => new Complex(a.real, a.imag)),
    ];

    for (let i = 0; i < this.state.numStates; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const j = i ^ (1 << target);
        const targetBit = (i >> target) & 1;

        if (targetBit === 0) {
          newAmplitudes[j] = new Complex(
            -this.state.amplitudes[i].imag,
            this.state.amplitudes[i].real,
          );
          newAmplitudes[i] = new Complex(0);
        }
      }
    }

    for (let i = 0; i < this.state.numStates; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const targetBit = (i >> target) & 1;
        if (targetBit === 1) {
          const j = i ^ (1 << target);
          newAmplitudes[j] = newAmplitudes[j].add(
            new Complex(
              this.state.amplitudes[i].imag,
              -this.state.amplitudes[i].real,
            ),
          );
        }
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  applySWAP(qubit1, qubit2) {
    const newAmplitudes = [...this.state.amplitudes];

    for (let i = 0; i < this.state.numStates; i++) {
      const bit1 = (i >> qubit1) & 1;
      const bit2 = (i >> qubit2) & 1;
      if (bit1 !== bit2) {
        const j = i ^ (1 << qubit1) ^ (1 << qubit2);
        if (i < j) {
          [newAmplitudes[i], newAmplitudes[j]] = [
            newAmplitudes[j],
            newAmplitudes[i],
          ];
        }
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  applyToffoli(control1, control2, target) {
    const newAmplitudes = [...this.state.amplitudes];

    for (let i = 0; i < this.state.numStates; i++) {
      const c1 = (i >> control1) & 1;
      const c2 = (i >> control2) & 1;
      if (c1 === 1 && c2 === 1) {
        const j = i ^ (1 << target);
        if (i < j) {
          [newAmplitudes[i], newAmplitudes[j]] = [
            newAmplitudes[j],
            newAmplitudes[i],
          ];
        }
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  applyControlledGate(gate, control, target) {
    const newAmplitudes = this.state.amplitudes.map(
      (a) => new Complex(a.real, a.imag),
    );

    for (let i = 0; i < this.state.numStates; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const targetBit = (i >> target) & 1;
        const i0 = i & ~(1 << target);
        const i1 = i | (1 << target);

        if (targetBit === 0) {
          const amp0 = this.state.amplitudes[i0];
          const amp1 = this.state.amplitudes[i1];

          newAmplitudes[i0] = gate[0][0]
            .multiply(amp0)
            .add(gate[0][1].multiply(amp1));
          newAmplitudes[i1] = gate[1][0]
            .multiply(amp0)
            .add(gate[1][1].multiply(amp1));
        }
      }
    }

    this.state.amplitudes = newAmplitudes;
  }

  run() {
    this.state.reset();

    for (const gate of this.gates) {
      this.applyGate(gate);
    }

    return this.state;
  }

  applyGate(gateOp) {
    const { name, target, control, control2, params } = gateOp;

    if (control === null) {
      let gateMatrix;

      switch (name) {
        case "H":
          gateMatrix = QuantumGates.H;
          break;
        case "X":
          gateMatrix = QuantumGates.X;
          break;
        case "Y":
          gateMatrix = QuantumGates.Y;
          break;
        case "Z":
          gateMatrix = QuantumGates.Z;
          break;
        case "S":
          gateMatrix = QuantumGates.S;
          break;
        case "Sdg":
          gateMatrix = QuantumGates.Sdg;
          break;
        case "T":
          gateMatrix = QuantumGates.T;
          break;
        case "Tdg":
          gateMatrix = QuantumGates.Tdg;
          break;
        case "Rx":
          gateMatrix = QuantumGates.Rx(params?.theta || Math.PI / 4);
          break;
        case "Ry":
          gateMatrix = QuantumGates.Ry(params?.theta || Math.PI / 4);
          break;
        case "Rz":
          gateMatrix = QuantumGates.Rz(params?.theta || Math.PI / 4);
          break;
        case "SX":
          gateMatrix = QuantumGates.SX;
          break;
        case "M":
          return this.state.measure(target);
        default:
          gateMatrix = QuantumGates.I;
      }

      this.applySingleQubitGate(gateMatrix, target);
    } else if (control2 === null) {
      switch (name) {
        case "CNOT":
        case "CX":
          this.applyCNOT(control, target);
          break;
        case "CZ":
          this.applyCZ(control, target);
          break;
        case "CY":
          this.applyCY(control, target);
          break;
        case "SWAP":
          this.applySWAP(control, target);
          break;
        case "CH":
          this.applyControlledGate(QuantumGates.H, control, target);
          break;
        case "CS":
          this.applyControlledGate(QuantumGates.S, control, target);
          break;
        case "CT":
          this.applyControlledGate(QuantumGates.T, control, target);
          break;
        case "CRx":
          this.applyControlledGate(
            QuantumGates.Rx(params?.theta || Math.PI / 4),
            control,
            target,
          );
          break;
        case "CRy":
          this.applyControlledGate(
            QuantumGates.Ry(params?.theta || Math.PI / 4),
            control,
            target,
          );
          break;
        case "CRz":
          this.applyControlledGate(
            QuantumGates.Rz(params?.theta || Math.PI / 4),
            control,
            target,
          );
          break;
      }
    } else {
      switch (name) {
        case "Toffoli":
        case "CCX":
          this.applyToffoli(control, control2, target);
          break;
      }
    }
  }

  runShots(shots = 1024) {
    const counts = {};

    for (let i = 0; i < shots; i++) {
      const stateCopy = this.state.clone();
      this.run();
      const result = this.state.measureAll();
      const bitString = result.toString(2).padStart(this.numQubits, "0");
      counts[bitString] = (counts[bitString] || 0) + 1;
      this.state = stateCopy;
    }

    return counts;
  }

  getStateVector() {
    const result = [];
    for (let i = 0; i < this.state.numStates; i++) {
      const amp = this.state.amplitudes[i];
      result.push({
        index: i,
        binary: this.state.toBinaryString(i),
        ket: this.state.toKetNotation(i),
        amplitude: amp,
        probability: amp.probability(),
      });
    }
    return result;
  }

  toQiskit() {
    let code = `from qiskit import QuantumCircuit, Aer, execute\n\n`;
    code += `qc = QuantumCircuit(${this.numQubits}, ${this.numQubits})\n`;

    for (const gate of this.gates) {
      switch (gate.name) {
        case "H":
          code += `qc.h(${gate.target})\n`;
          break;
        case "X":
          code += `qc.x(${gate.target})\n`;
          break;
        case "Y":
          code += `qc.y(${gate.target})\n`;
          break;
        case "Z":
          code += `qc.z(${gate.target})\n`;
          break;
        case "S":
          code += `qc.s(${gate.target})\n`;
          break;
        case "T":
          code += `qc.t(${gate.target})\n`;
          break;
        case "Rx":
          code += `qc.rx(${gate.params?.theta || Math.PI / 4}, ${gate.target})\n`;
          break;
        case "Ry":
          code += `qc.ry(${gate.params?.theta || Math.PI / 4}, ${gate.target})\n`;
          break;
        case "Rz":
          code += `qc.rz(${gate.params?.theta || Math.PI / 4}, ${gate.target})\n`;
          break;
        case "CNOT":
          code += `qc.cx(${gate.control}, ${gate.target})\n`;
          break;
        case "CZ":
          code += `qc.cz(${gate.control}, ${gate.target})\n`;
          break;
        case "SWAP":
          code += `qc.swap(${gate.control}, ${gate.target})\n`;
          break;
        case "Toffoli":
          code += `qc.ccx(${gate.control}, ${gate.control2}, ${gate.target})\n`;
          break;
        case "M":
          code += `qc.measure(${gate.target}, ${gate.target})\n`;
          break;
      }
    }

    code += `\n# Run simulation\n`;
    code += `simulator = Aer.get_backend('statevector_simulator')\n`;
    code += `result = execute(qc, simulator).result()\n`;
    code += `statevector = result.get_statevector()\n`;
    code += `print(statevector)\n`;

    return code;
  }

  toCirq() {
    let code = `import cirq\nimport numpy as np\n\n`;
    code += `# Create qubits\n`;
    code += `qubits = [cirq.LineQubit(i) for i in range(${this.numQubits})]\n\n`;
    code += `# Build circuit\n`;
    code += `circuit = cirq.Circuit()\n`;

    for (const gate of this.gates) {
      switch (gate.name) {
        case "H":
          code += `circuit.append(cirq.H(qubits[${gate.target}]))\n`;
          break;
        case "X":
          code += `circuit.append(cirq.X(qubits[${gate.target}]))\n`;
          break;
        case "Y":
          code += `circuit.append(cirq.Y(qubits[${gate.target}]))\n`;
          break;
        case "Z":
          code += `circuit.append(cirq.Z(qubits[${gate.target}]))\n`;
          break;
        case "S":
          code += `circuit.append(cirq.S(qubits[${gate.target}]))\n`;
          break;
        case "T":
          code += `circuit.append(cirq.T(qubits[${gate.target}]))\n`;
          break;
        case "CNOT":
          code += `circuit.append(cirq.CNOT(qubits[${gate.control}], qubits[${gate.target}]))\n`;
          break;
        case "CZ":
          code += `circuit.append(cirq.CZ(qubits[${gate.control}], qubits[${gate.target}]))\n`;
          break;
        case "SWAP":
          code += `circuit.append(cirq.SWAP(qubits[${gate.control}], qubits[${gate.target}]))\n`;
          break;
        case "M":
          code += `circuit.append(cirq.measure(qubits[${gate.target}], key='m${gate.target}'))\n`;
          break;
      }
    }

    code += `\nprint(circuit)\n`;
    code += `\n# Simulate\n`;
    code += `simulator = cirq.Simulator()\n`;
    code += `result = simulator.simulate(circuit)\n`;
    code += `print(result.final_state_vector)\n`;

    return code;
  }

  toQSharp() {
    let code = `namespace QuantumLab {\n`;
    code += `    open Microsoft.Quantum.Canon;\n`;
    code += `    open Microsoft.Quantum.Intrinsic;\n`;
    code += `    open Microsoft.Quantum.Measurement;\n\n`;
    code += `    operation RunCircuit() : Result[] {\n`;
    code += `        use qubits = Qubit[${this.numQubits}];\n`;
    code += `        \n`;

    for (const gate of this.gates) {
      switch (gate.name) {
        case "H":
          code += `        H(qubits[${gate.target}]);\n`;
          break;
        case "X":
          code += `        X(qubits[${gate.target}]);\n`;
          break;
        case "Y":
          code += `        Y(qubits[${gate.target}]);\n`;
          break;
        case "Z":
          code += `        Z(qubits[${gate.target}]);\n`;
          break;
        case "S":
          code += `        S(qubits[${gate.target}]);\n`;
          break;
        case "T":
          code += `        T(qubits[${gate.target}]);\n`;
          break;
        case "CNOT":
          code += `        CNOT(qubits[${gate.control}], qubits[${gate.target}]);\n`;
          break;
        case "CZ":
          code += `        CZ(qubits[${gate.control}], qubits[${gate.target}]);\n`;
          break;
        case "SWAP":
          code += `        SWAP(qubits[${gate.control}], qubits[${gate.target}]);\n`;
          break;
      }
    }

    code += `        \n`;
    code += `        let results = MultiM(qubits);\n`;
    code += `        ResetAll(qubits);\n`;
    code += `        return results;\n`;
    code += `    }\n`;
    code += `}\n`;

    return code;
  }
}

class QuantumAlgorithms {
  static deutschJozsa(circuit, oracle = "balanced") {
    const n = circuit.numQubits - 1;

    circuit.addGate("X", n);

    for (let i = 0; i <= n; i++) {
      circuit.addGate("H", i);
    }

    if (oracle === "balanced") {
      for (let i = 0; i < n; i++) {
        circuit.addGate("CNOT", n, i);
      }
    }

    for (let i = 0; i < n; i++) {
      circuit.addGate("H", i);
    }

    for (let i = 0; i < n; i++) {
      circuit.addGate("M", i);
    }

    return circuit;
  }

  static grover(circuit, markedState = 0) {
    const n = circuit.numQubits;
    const iterations = Math.floor((Math.PI / 4) * Math.sqrt(1 << n));

    for (let i = 0; i < n; i++) {
      circuit.addGate("H", i);
    }

    for (let iter = 0; iter < Math.max(1, iterations); iter++) {
      if (n >= 2) {
        const markedBits = markedState.toString(2).padStart(n, "0");
        for (let i = 0; i < n; i++) {
          if (markedBits[n - 1 - i] === "0") {
            circuit.addGate("X", i);
          }
        }

        if (n === 2) {
          circuit.addGate("CZ", 0, 1);
        } else if (n >= 3) {
          circuit.addGate("H", n - 1);
          circuit.addGate("Toffoli", n - 1, 0, 1);
          circuit.addGate("H", n - 1);
        }

        for (let i = 0; i < n; i++) {
          if (markedBits[n - 1 - i] === "0") {
            circuit.addGate("X", i);
          }
        }
      }

      for (let i = 0; i < n; i++) {
        circuit.addGate("H", i);
      }
      for (let i = 0; i < n; i++) {
        circuit.addGate("X", i);
      }

      if (n === 2) {
        circuit.addGate("CZ", 0, 1);
      } else if (n >= 3) {
        circuit.addGate("H", n - 1);
        circuit.addGate("Toffoli", n - 1, 0, 1);
        circuit.addGate("H", n - 1);
      }

      for (let i = 0; i < n; i++) {
        circuit.addGate("X", i);
      }
      for (let i = 0; i < n; i++) {
        circuit.addGate("H", i);
      }
    }

    return circuit;
  }

  static qft(circuit) {
    const n = circuit.numQubits;

    for (let i = n - 1; i >= 0; i--) {
      circuit.addGate("H", i);

      for (let j = i - 1; j >= 0; j--) {
        const k = i - j + 1;
        const angle = Math.PI / (1 << (k - 1));
        circuit.addGate("CRz", i, j, null, { theta: angle });
      }
    }

    for (let i = 0; i < Math.floor(n / 2); i++) {
      circuit.addGate("SWAP", i, n - 1 - i);
    }

    return circuit;
  }

  static bellState(circuit, qubit1 = 0, qubit2 = 1) {
    circuit.addGate("H", qubit1);
    circuit.addGate("CNOT", qubit2, qubit1);
    return circuit;
  }

  static ghzState(circuit) {
    const n = circuit.numQubits;
    circuit.addGate("H", 0);
    for (let i = 1; i < n; i++) {
      circuit.addGate("CNOT", i, 0);
    }
    return circuit;
  }

  static teleportation(circuit) {
    circuit.addGate("H", 1);
    circuit.addGate("CNOT", 2, 1);

    circuit.addGate("CNOT", 1, 0);
    circuit.addGate("H", 0);

    circuit.addGate("CNOT", 2, 1);
    circuit.addGate("CZ", 2, 0);

    return circuit;
  }

  static vqeAnsatz(circuit, params = []) {
    const n = circuit.numQubits;
    const depth = 2;
    let paramIndex = 0;

    for (let d = 0; d < depth; d++) {
      for (let i = 0; i < n; i++) {
        const theta = params[paramIndex++] || Math.random() * 2 * Math.PI;
        const phi = params[paramIndex++] || Math.random() * 2 * Math.PI;
        circuit.addGate("Ry", i, null, null, { theta });
        circuit.addGate("Rz", i, null, null, { theta: phi });
      }

      for (let i = 0; i < n - 1; i++) {
        circuit.addGate("CNOT", i + 1, i);
      }
    }

    return circuit;
  }

  static qaoa(circuit, gamma = 0.5, beta = 0.5) {
    const n = circuit.numQubits;

    for (let i = 0; i < n; i++) {
      circuit.addGate("H", i);
    }

    for (let i = 0; i < n - 1; i++) {
      circuit.addGate("CNOT", i + 1, i);
      circuit.addGate("Rz", i + 1, null, null, { theta: 2 * gamma });
      circuit.addGate("CNOT", i + 1, i);
    }

    for (let i = 0; i < n; i++) {
      circuit.addGate("Rx", i, null, null, { theta: 2 * beta });
    }

    return circuit;
  }
}

window.Complex = Complex;
window.QuantumGates = QuantumGates;
window.QuantumState = QuantumState;
window.QuantumCircuit = QuantumCircuit;
window.QuantumAlgorithms = QuantumAlgorithms;
