class BlochSphere {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.options = {
      size: options.size || 400,
      backgroundColor: options.backgroundColor || "transparent",
      sphereColor: options.sphereColor || "rgba(0, 245, 255, 0.1)",
      axisColor: options.axisColor || "rgba(255, 255, 255, 0.3)",
      stateColor: options.stateColor || "#00f5ff",
      historyColor: options.historyColor || "rgba(191, 0, 255, 0.5)",
      showAxesLabels: options.showAxesLabels !== false,
      showEquator: options.showEquator !== false,
      showMeridians: options.showMeridians !== false,
      animate: options.animate !== false,
    };

    this.theta = 0;
    this.phi = 0;

    this.rotationY = 0;
    this.rotationX = 0.3;
    this.autoRotate = false;
    this.animationFrame = null;

    this.stateHistory = [];
    this.maxHistory = 50;

    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.resize();
    this.setupEventListeners();
    if (this.options.animate) {
      this.animate();
    } else {
      this.render();
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, this.options.size);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.scale(dpr, dpr);
    this.width = size;
    this.height = size;
    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = size * 0.35;
  }

  setupEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", () => this.onMouseUp());
    this.canvas.addEventListener("mouseleave", () => this.onMouseUp());
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e));

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener("touchend", () => this.onMouseUp());

    window.addEventListener("resize", () => this.resize());
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.autoRotate = false;
    const rect = this.canvas.getBoundingClientRect();
    this.lastMouse = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  onMouseMove(e) {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - this.lastMouse.x;
    const dy = y - this.lastMouse.y;

    this.rotationY += dx * 0.01;
    this.rotationX += dy * 0.01;
    this.rotationX = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.rotationX),
    );

    this.lastMouse = { x, y };

    if (!this.options.animate) {
      this.render();
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    this.radius *= e.deltaY > 0 ? 0.95 : 1.05;
    this.radius = Math.max(50, Math.min(this.width * 0.45, this.radius));

    if (!this.options.animate) {
      this.render();
    }
  }

  project(x, y, z) {
    let [rx, ry, rz] = this.rotatePoint(
      x,
      y,
      z,
      this.rotationX,
      this.rotationY,
    );

    const scale = 1 + rz * 0.2;

    return {
      x: this.centerX + rx * this.radius * scale,
      y: this.centerY - ry * this.radius * scale,
      z: rz,
      scale: scale,
    };
  }

  rotatePoint(x, y, z, rotX, rotY) {
    let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
    let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);

    let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
    let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);

    return [x2, y1, z2];
  }

  setState(theta, phi) {
    this.theta = theta;
    this.phi = phi;

    this.stateHistory.push({ theta, phi });
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    if (!this.options.animate) {
      this.render();
    }
  }

  setStandardState(state) {
    switch (state) {
      case "0":
      case "|0⟩":
        this.setState(0, 0);
        break;
      case "1":
      case "|1⟩":
        this.setState(Math.PI, 0);
        break;
      case "+":
      case "|+⟩":
        this.setState(Math.PI / 2, 0);
        break;
      case "-":
      case "|-⟩":
        this.setState(Math.PI / 2, Math.PI);
        break;
      case "i":
      case "|i⟩":
        this.setState(Math.PI / 2, Math.PI / 2);
        break;
      case "-i":
      case "|-i⟩":
        this.setState(Math.PI / 2, -Math.PI / 2);
        break;
    }
  }

  setAmplitudes(alpha, beta) {
    const alphaAbs =
      alpha instanceof Complex ? alpha.magnitude() : Math.abs(alpha);
    const betaAbs = beta instanceof Complex ? beta.magnitude() : Math.abs(beta);

    const theta = 2 * Math.acos(alphaAbs);

    let phi = 0;
    if (beta instanceof Complex) {
      phi = beta.phase() - (alpha instanceof Complex ? alpha.phase() : 0);
    }

    this.setState(theta, phi);
  }

  applyGate(gateName) {
    let newTheta = this.theta;
    let newPhi = this.phi;

    switch (gateName) {
      case "X":
        newTheta = Math.PI - this.theta;
        newPhi = Math.PI - this.phi;
        break;
      case "Y":
        newTheta = Math.PI - this.theta;
        newPhi = -this.phi;
        break;
      case "Z":
        newPhi = this.phi + Math.PI;
        break;
      case "H":
        if (this.theta < 0.01) {
          newTheta = Math.PI / 2;
          newPhi = 0;
        } else if (Math.abs(this.theta - Math.PI) < 0.01) {
          newTheta = Math.PI / 2;
          newPhi = Math.PI;
        } else if (
          Math.abs(this.theta - Math.PI / 2) < 0.01 &&
          Math.abs(this.phi) < 0.01
        ) {
          newTheta = 0;
          newPhi = 0;
        } else if (
          Math.abs(this.theta - Math.PI / 2) < 0.01 &&
          Math.abs(this.phi - Math.PI) < 0.01
        ) {
          newTheta = Math.PI;
          newPhi = 0;
        } else {
          const x = Math.sin(this.theta) * Math.cos(this.phi);
          const y = Math.sin(this.theta) * Math.sin(this.phi);
          const z = Math.cos(this.theta);

          const newX = z;
          const newZ = x;

          newTheta = Math.acos(newZ);
          newPhi = Math.atan2(y, newX);
        }
        break;
      case "S":
        newPhi = this.phi + Math.PI / 2;
        break;
      case "T":
        newPhi = this.phi + Math.PI / 4;
        break;
    }

    while (newPhi < 0) newPhi += 2 * Math.PI;
    while (newPhi >= 2 * Math.PI) newPhi -= 2 * Math.PI;

    newTheta = Math.max(0, Math.min(Math.PI, newTheta));

    this.animateTransition(newTheta, newPhi);
  }

  animateTransition(targetTheta, targetPhi, duration = 500) {
    const startTheta = this.theta;
    const startPhi = this.phi;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      this.theta = startTheta + (targetTheta - startTheta) * eased;
      this.phi = startPhi + (targetPhi - startPhi) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.theta = targetTheta;
        this.phi = targetPhi;
      }

      if (progress < 1) {
        this.stateHistory.push({ theta: this.theta, phi: this.phi });
        if (this.stateHistory.length > this.maxHistory) {
          this.stateHistory.shift();
        }
      }
    };

    requestAnimationFrame(animate);
  }

  getStateVector() {
    const cosHalfTheta = Math.cos(this.theta / 2);
    const sinHalfTheta = Math.sin(this.theta / 2);

    return {
      alpha: new Complex(cosHalfTheta, 0),
      beta: new Complex(
        sinHalfTheta * Math.cos(this.phi),
        sinHalfTheta * Math.sin(this.phi),
      ),
    };
  }

  getProbabilities() {
    const cosHalfTheta = Math.cos(this.theta / 2);
    const sinHalfTheta = Math.sin(this.theta / 2);

    return {
      p0: cosHalfTheta * cosHalfTheta,
      p1: sinHalfTheta * sinHalfTheta,
    };
  }

  getBlochVector() {
    return {
      x: Math.sin(this.theta) * Math.cos(this.phi),
      y: Math.sin(this.theta) * Math.sin(this.phi),
      z: Math.cos(this.theta),
    };
  }

  animate() {
    if (this.autoRotate) {
      this.rotationY += 0.005;
    }

    this.render();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    if (this.options.backgroundColor !== "transparent") {
      ctx.fillStyle = this.options.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    this.drawSphere();

    this.drawAxes();

    if (this.options.showMeridians) {
      this.drawMeridians();
    }

    this.drawStateHistory();

    this.drawStateVector();
  }

  drawSphere() {
    const ctx = this.ctx;

    const gradient = ctx.createRadialGradient(
      this.centerX - this.radius * 0.3,
      this.centerY - this.radius * 0.3,
      0,
      this.centerX,
      this.centerY,
      this.radius,
    );
    gradient.addColorStop(0, "rgba(0, 245, 255, 0.15)");
    gradient.addColorStop(0.7, "rgba(0, 245, 255, 0.05)");
    gradient.addColorStop(1, "rgba(191, 0, 255, 0.1)");

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 245, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawAxes() {
    const ctx = this.ctx;
    const axisLength = 1.1;

    const xPos = this.project(axisLength, 0, 0);
    const xNeg = this.project(-axisLength, 0, 0);

    ctx.beginPath();
    ctx.moveTo(xNeg.x, xNeg.y);
    ctx.lineTo(xPos.x, xPos.y);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const yPos = this.project(0, axisLength, 0);
    const yNeg = this.project(0, -axisLength, 0);

    ctx.beginPath();
    ctx.moveTo(yNeg.x, yNeg.y);
    ctx.lineTo(yPos.x, yPos.y);
    ctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const zPos = this.project(0, 0, axisLength);
    const zNeg = this.project(0, 0, -axisLength);

    ctx.beginPath();
    ctx.moveTo(zNeg.x, zNeg.y);
    ctx.lineTo(zPos.x, zPos.y);
    ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.options.showAxesLabels) {
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
      ctx.fillText("|0⟩", zPos.x, zPos.y - 15);

      ctx.fillText("|1⟩", zNeg.x, zNeg.y + 15);

      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.fillText("|+⟩", xPos.x + 15, xPos.y);

      ctx.fillText("|-⟩", xNeg.x - 15, xNeg.y);

      ctx.fillStyle = "rgba(34, 197, 94, 0.8)";
      ctx.fillText("|i⟩", yPos.x, yPos.y - 15);

      ctx.fillText("|-i⟩", yNeg.x, yNeg.y + 15);
    }
  }

  drawMeridians() {
    const ctx = this.ctx;
    const segments = 36;

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const p = this.project(Math.cos(angle), Math.sin(angle), 0);

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const p = this.project(Math.cos(angle), 0, Math.sin(angle));

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const p = this.project(0, Math.cos(angle), Math.sin(angle));

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();
  }

  drawStateHistory() {
    if (this.stateHistory.length < 2) return;

    const ctx = this.ctx;

    ctx.beginPath();
    for (let i = 0; i < this.stateHistory.length; i++) {
      const { theta, phi } = this.stateHistory[i];
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      const p = this.project(x, y, z);

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "rgba(191, 0, 255, 0)");
    gradient.addColorStop(1, "rgba(191, 0, 255, 0.5)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawStateVector() {
    const ctx = this.ctx;

    const x = Math.sin(this.theta) * Math.cos(this.phi);
    const y = Math.sin(this.theta) * Math.sin(this.phi);
    const z = Math.cos(this.theta);

    const origin = this.project(0, 0, 0);
    const tip = this.project(x, y, z);

    const gradient = ctx.createLinearGradient(origin.x, origin.y, tip.x, tip.y);
    gradient.addColorStop(0, "rgba(0, 245, 255, 0.5)");
    gradient.addColorStop(1, "#00f5ff");

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    const angle = Math.atan2(tip.y - origin.y, tip.x - origin.x);
    const arrowSize = 12;

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(
      tip.x - arrowSize * Math.cos(angle - Math.PI / 6),
      tip.y - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      tip.x - arrowSize * Math.cos(angle + Math.PI / 6),
      tip.y - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = "#00f5ff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    const projXY = this.project(x, y, 0);

    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(projXY.x, projXY.y);
    ctx.strokeStyle = "rgba(0, 245, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(projXY.x, projXY.y);
    ctx.lineTo(origin.x, origin.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(projXY.x, projXY.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 245, 255, 0.5)";
    ctx.fill();
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

class ProbabilityChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    this.probabilities = {};

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;

    this.render();
  }

  setProbabilities(probs) {
    this.probabilities = probs;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const entries = Object.entries(this.probabilities).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    if (entries.length === 0) return;

    ctx.clearRect(0, 0, this.width, this.height);

    const barWidth = Math.min(40, (this.width - 40) / entries.length - 10);
    const maxBarHeight = this.height - 60;
    const startX = (this.width - (entries.length * (barWidth + 10) - 10)) / 2;

    entries.forEach(([label, prob], index) => {
      const x = startX + index * (barWidth + 10);
      const barHeight = prob * maxBarHeight;
      const y = this.height - 30 - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, this.height - 30);
      gradient.addColorStop(0, "#00f5ff");
      gradient.addColorStop(1, "#bf00ff");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#a0a0b0";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`|${label}⟩`, x + barWidth / 2, this.height - 10);

      if (prob > 0.01) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Inter, sans-serif";
        ctx.fillText(`${(prob * 100).toFixed(1)}%`, x + barWidth / 2, y - 8);
      }
    });
  }
}

window.BlochSphere = BlochSphere;
window.ProbabilityChart = ProbabilityChart;
