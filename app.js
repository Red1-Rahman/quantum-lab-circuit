let circuit = null;
let blochSphere = null;
let mainBlochSphere = null;
let probabilityChart = null;
let selectedGate = null;
let currentLang = "qiskit";

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  circuit = new QuantumCircuit(3);

  setTimeout(() => {
    initializeBlochSpheres();
    initializeProbabilityChart();
  }, 100);

  setupNavigation();
  setupToolbar();
  setupGateDragDrop();
  setupResultsTabs();
  setupVisualizerControls();
  setupCodeExport();
  setupParticleBackground();
  animateStats();

  addDemoCircuit();
}

function initializeBlochSpheres() {
  const blochContainer = document.getElementById("bloch-container");
  if (blochContainer) {
    const canvas = document.getElementById("bloch-canvas");
    if (canvas) {
      blochSphere = new BlochSphere("bloch-canvas", {
        size: 250,
        animate: true,
      });
    }
  }

  const mainCanvas = document.getElementById("bloch-main-canvas");
  if (mainCanvas) {
    mainBlochSphere = new BlochSphere("bloch-main-canvas", {
      size: 450,
      animate: true,
    });
    mainBlochSphere.autoRotate = true;
  }
}

function initializeProbabilityChart() {
  const canvas = document.getElementById("prob-canvas");
  if (canvas) {
    probabilityChart = new ProbabilityChart("prob-canvas");
    updateProbabilityChart();
  }
}

function setupNavigation() {
  const navbar = document.getElementById("navbar");
  const navLinks = document.querySelectorAll(".nav-links a");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: "smooth",
        });
      }

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
    });
  }
}

function setupToolbar() {
  const toolBtns = document.querySelectorAll(".tool-btn[data-tool]");
  toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      toolBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("add-qubit")?.addEventListener("click", () => {
    if (circuit.numQubits < 8) {
      circuit.addQubit();
      renderCircuit();
      showNotification("Qubit added", "success");
    } else {
      showNotification("Maximum 8 qubits supported", "warning");
    }
  });

  document.getElementById("remove-qubit")?.addEventListener("click", () => {
    if (circuit.numQubits > 1) {
      circuit.removeQubit();
      renderCircuit();
      showNotification("Qubit removed", "info");
    } else {
      showNotification("Minimum 1 qubit required", "warning");
    }
  });

  document.getElementById("clear-circuit")?.addEventListener("click", () => {
    circuit.reset();
    renderCircuit();
    updateResults();
    showNotification("Circuit cleared", "info");
  });

  document.getElementById("run-circuit")?.addEventListener("click", () => {
    runCircuit();
  });
}

function setupGateDragDrop() {
  const gateItems = document.querySelectorAll(".gate-item");

  gateItems.forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item.dataset.gate);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });

    item.addEventListener("click", () => {
      const gateName = item.dataset.gate;
      addGateToCircuit(gateName, 0);
    });
  });

  const circuitCanvas = document.getElementById("circuit-canvas");
  if (circuitCanvas) {
    const qubitRows = circuitCanvas.querySelectorAll(".qubit-row");

    qubitRows.forEach((row, qubitIndex) => {
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        row.classList.add("drag-over");
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const gateName = e.dataTransfer.getData("text/plain");
        addGateToCircuit(gateName, qubitIndex);
      });
    });
  }
}

function addGateToCircuit(gateName, qubitIndex) {
  if (["CNOT", "CZ", "SWAP"].includes(gateName)) {
    const controlQubit = qubitIndex;
    const targetQubit = (qubitIndex + 1) % circuit.numQubits;
    circuit.addGate(gateName, targetQubit, controlQubit);
  } else if (gateName === "Toffoli") {
    if (circuit.numQubits >= 3) {
      circuit.addGate(gateName, 2, 0, 1);
    } else {
      showNotification("Toffoli gate requires at least 3 qubits", "warning");
      return;
    }
  } else {
    if (["Rx", "Ry", "Rz"].includes(gateName)) {
      circuit.addGate(gateName, qubitIndex, null, null, { theta: Math.PI / 4 });
    } else {
      circuit.addGate(gateName, qubitIndex);
    }
  }

  renderCircuit();
  showNotification(`Added ${gateName} gate`, "success");
}

function renderCircuit() {
  const circuitCanvas = document.getElementById("circuit-canvas");
  if (!circuitCanvas) return;

  circuitCanvas.innerHTML = "";

  for (let i = 0; i < circuit.numQubits; i++) {
    const row = document.createElement("div");
    row.className = "qubit-row";
    row.dataset.qubit = i;

    row.innerHTML = `
            <div class="qubit-label">q[${i}]</div>
            <div class="qubit-wire">
                <div class="wire-line"></div>
                <div class="gate-slots" id="slots-${i}"></div>
            </div>
            <div class="qubit-output">|0⟩</div>
        `;

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const gateName = e.dataTransfer.getData("text/plain");
      addGateToCircuit(gateName, i);
    });

    circuitCanvas.appendChild(row);
  }

  const gatePositions = {};

  circuit.gates.forEach((gate, index) => {
    const slotsContainer = document.getElementById(`slots-${gate.target}`);
    if (!slotsContainer) return;

    const gateEl = document.createElement("div");
    gateEl.className = "placed-gate";
    gateEl.dataset.index = index;

    let symbol = gate.name;
    if (gate.name === "CNOT") symbol = "⊕";
    else if (gate.name === "SWAP") symbol = "⨯";
    else if (gate.name === "M") symbol = "📊";
    else if (gate.name === "Toffoli") symbol = "CCX";

    gateEl.textContent = symbol;

    if (["CNOT", "CZ", "CY", "SWAP"].includes(gate.name)) {
      gateEl.style.borderColor = "#bf00ff";
      gateEl.style.color = "#bf00ff";
      gateEl.style.boxShadow = "0 0 15px rgba(191, 0, 255, 0.3)";
    } else if (gate.name === "M") {
      gateEl.style.borderColor = "#10b981";
      gateEl.style.color = "#10b981";
      gateEl.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.3)";
    }

    gateEl.addEventListener("click", () => {
      circuit.removeGate(index);
      renderCircuit();
      showNotification("Gate removed", "info");
    });

    slotsContainer.appendChild(gateEl);

    if (gate.control !== null) {
      drawControlConnection(gate, slotsContainer);
    }
  });

  updateCodeExport();
}

function drawControlConnection(gate, slotsContainer) {
  const connection = document.createElement("div");
  connection.className = "control-connection";
  connection.style.cssText = `
        position: absolute;
        width: 2px;
        background: linear-gradient(to bottom, #bf00ff, #00f5ff);
        left: 50%;
        transform: translateX(-50%);
    `;

  const controlRow = document.querySelector(`[data-qubit="${gate.control}"]`);
  const targetRow = document.querySelector(`[data-qubit="${gate.target}"]`);

  if (controlRow && targetRow) {
    const controlSlots = controlRow.querySelector(".gate-slots");

    const controlDot = document.createElement("div");
    controlDot.className = "control-dot";
    controlDot.style.cssText = `
            width: 12px;
            height: 12px;
            background: #bf00ff;
            border-radius: 50%;
            box-shadow: 0 0 10px #bf00ff;
        `;

    if (controlSlots) {
      controlSlots.appendChild(controlDot);
    }
  }
}

function runCircuit() {
  const runBtn = document.getElementById("run-circuit");
  if (runBtn) {
    runBtn.classList.add("running");
    runBtn.innerHTML = `
            <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
        `;
  }

  setTimeout(() => {
    circuit.run();

    updateResults();

    if (runBtn) {
      runBtn.classList.remove("running");
      runBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
            `;
    }

    showNotification("Circuit executed successfully!", "success");
  }, 500);
}

function updateResults() {
  const stateVector = circuit.getStateVector();

  const stateDisplay = document.querySelector(".statevector-display");
  if (stateDisplay) {
    stateDisplay.innerHTML = stateVector
      .map(
        (state) => `
            <div class="state-item">
                <span class="state-basis">${state.ket}</span>
                <span class="state-amplitude">${state.amplitude.toString()}</span>
                <div class="state-bar" style="width: ${state.probability * 100}%"></div>
            </div>
        `,
      )
      .join("");
  }

  updateProbabilityChart();

  updateBlochSphere();
}

function updateProbabilityChart() {
  if (!probabilityChart) return;

  const stateVector = circuit.getStateVector();
  const probs = {};

  stateVector.forEach((state) => {
    if (state.probability > 0.0001) {
      probs[state.binary] = state.probability;
    }
  });

  probabilityChart.setProbabilities(probs);
}

function updateBlochSphere() {
  if (!blochSphere) return;

  const stateVector = circuit.getStateVector();

  let prob0 = 0;
  let prob1 = 0;

  stateVector.forEach((state) => {
    const qubit0 = state.binary[state.binary.length - 1];
    if (qubit0 === "0") {
      prob0 += state.probability;
    } else {
      prob1 += state.probability;
    }
  });

  const theta = 2 * Math.acos(Math.sqrt(prob0));
  blochSphere.setState(theta, 0);
}

function setupResultsTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`${tab}-tab`)?.classList.add("active");
    });
  });
}

function setupVisualizerControls() {
  const stateBtns = document.querySelectorAll(".state-btn");
  stateBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      stateBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (mainBlochSphere) {
        mainBlochSphere.setStandardState(btn.dataset.state);
        updateVisualizerDisplay();
      }
    });
  });

  const thetaSlider = document.getElementById("theta-slider");
  const phiSlider = document.getElementById("phi-slider");

  if (thetaSlider) {
    thetaSlider.addEventListener("input", () => {
      const theta = (thetaSlider.value / 180) * Math.PI;
      document.getElementById("theta-value").textContent =
        `${thetaSlider.value}°`;

      if (mainBlochSphere) {
        mainBlochSphere.theta = theta;
        updateVisualizerDisplay();
      }
    });
  }

  if (phiSlider) {
    phiSlider.addEventListener("input", () => {
      const phi = (phiSlider.value / 180) * Math.PI;
      document.getElementById("phi-value").textContent = `${phiSlider.value}°`;

      if (mainBlochSphere) {
        mainBlochSphere.phi = phi;
        updateVisualizerDisplay();
      }
    });
  }
}

function updateVisualizerDisplay() {
  if (!mainBlochSphere) return;

  const { alpha, beta } = mainBlochSphere.getStateVector();
  const { p0, p1 } = mainBlochSphere.getProbabilities();

  document.getElementById("alpha-display").textContent = alpha
    .magnitude()
    .toFixed(2);
  document.getElementById("beta-display").textContent = beta
    .magnitude()
    .toFixed(2);

  document.getElementById("prob-0-fill").style.width = `${p0 * 100}%`;
  document.getElementById("prob-1-fill").style.width = `${p1 * 100}%`;
  document.getElementById("prob-0-text").textContent =
    `${(p0 * 100).toFixed(1)}%`;
  document.getElementById("prob-1-text").textContent =
    `${(p1 * 100).toFixed(1)}%`;
}

window.applyGateViz = function (gateName) {
  if (mainBlochSphere) {
    mainBlochSphere.applyGate(gateName);

    document
      .querySelectorAll(".state-btn")
      .forEach((b) => b.classList.remove("active"));

    setTimeout(updateVisualizerDisplay, 600);
  }
};

function setupCodeExport() {
  const codeTabs = document.querySelectorAll(".code-tab");

  codeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      codeTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentLang = tab.dataset.lang;
      updateCodeExport();
    });
  });
}

function updateCodeExport() {
  const codeEl = document.getElementById("export-code");
  if (!codeEl) return;

  let code = "";
  switch (currentLang) {
    case "qiskit":
      code = circuit.toQiskit();
      break;
    case "cirq":
      code = circuit.toCirq();
      break;
    case "qsharp":
      code = circuit.toQSharp();
      break;
  }

  codeEl.textContent = code;
}

window.copyCode = function () {
  const codeEl = document.getElementById("export-code");
  if (codeEl) {
    navigator.clipboard.writeText(codeEl.textContent);
    showNotification("Code copied to clipboard!", "success");
  }
};

function addDemoCircuit() {
  circuit.addGate("H", 0);
  circuit.addGate("CNOT", 1, 0);
  renderCircuit();

  setTimeout(() => {
    runCircuit();
  }, 500);
}

window.loadAlgorithm = function (algorithm) {
  circuit.reset();

  switch (algorithm) {
    case "grover":
      circuit = new QuantumCircuit(3);
      QuantumAlgorithms.grover(circuit, 7);
      break;
    case "shor":
      circuit = new QuantumCircuit(4);
      QuantumAlgorithms.qft(circuit);
      break;
    case "qft":
      circuit = new QuantumCircuit(4);
      QuantumAlgorithms.qft(circuit);
      break;
    case "vqe":
      circuit = new QuantumCircuit(4);
      QuantumAlgorithms.vqeAnsatz(circuit);
      break;
    case "qaoa":
      circuit = new QuantumCircuit(4);
      QuantumAlgorithms.qaoa(circuit, 0.5, 0.5);
      break;
    case "bb84":
      circuit = new QuantumCircuit(2);
      circuit.addGate("H", 0);
      circuit.addGate("CNOT", 1, 0);
      circuit.addGate("H", 0);
      circuit.addGate("H", 1);
      break;
  }

  renderCircuit();
  runCircuit();
  scrollToSection("simulator");
  showNotification(`Loaded ${algorithm.toUpperCase()} algorithm`, "success");
};

window.scrollToSection = function (sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    window.scrollTo({
      top: section.offsetTop - 80,
      behavior: "smooth",
    });
  }
};

function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;

  notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${
          type === "success"
            ? "rgba(16, 185, 129, 0.9)"
            : type === "warning"
              ? "rgba(245, 158, 11, 0.9)"
              : type === "error"
                ? "rgba(239, 68, 68, 0.9)"
                : "rgba(59, 130, 246, 0.9)"
        };
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        backdrop-filter: blur(10px);
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .spin {
        animation: spin 1s linear infinite;
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
    }
    
    .drag-over {
        background: rgba(0, 245, 255, 0.1) !important;
        border-color: var(--accent-cyan) !important;
    }
    
    .dragging {
        opacity: 0.5;
    }
`;
document.head.appendChild(style);

function setupParticleBackground() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 15000);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? "#00f5ff" : "#bf00ff",
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.fill();

      particles.slice(i + 1).forEach((p2) => {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = (1 - dist / 150) * 0.2;
          ctx.stroke();
        }
      });
    });

    ctx.globalAlpha = 1;
    animationId = requestAnimationFrame(animate);
  }

  resize();
  createParticles();
  animate();

  window.addEventListener("resize", () => {
    resize();
    createParticles();
  });
}

function animateStats() {
  const statValues = document.querySelectorAll(".stat-value[data-count]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const duration = 2000;
          const start = performance.now();

          function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            el.textContent =
              target % 1 === 0 ? Math.floor(current) : current.toFixed(1);

            if (progress < 1) {
              requestAnimationFrame(update);
            }
          }

          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 },
  );

  statValues.forEach((el) => observer.observe(el));
}

console.log(
  `
%c QuantumLab Pro %c
%c The World's Most Advanced Quantum Computing Virtual Laboratory

🔬 Features:
  • Build and simulate quantum circuits
  • Visualize qubit states on Bloch sphere
  • Explore famous quantum algorithms
  • Export to Qiskit, Cirq, Q#

📚 Documentation: quantumlab.pro/docs
🐛 Report Issues: github.com/quantumlab/issues

`,
  "background: linear-gradient(135deg, #00f5ff, #bf00ff); color: white; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 8px;",
  "",
  "color: #a0a0b0; font-size: 12px;",
);
