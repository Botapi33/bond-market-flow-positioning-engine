const us10yInput = document.getElementById("us10yInput");
const us2yInput = document.getElementById("us2yInput");
const de10yInput = document.getElementById("de10yInput");
const uk10yInput = document.getElementById("uk10yInput");
const jp10yInput = document.getElementById("jp10yInput");
const realYieldInput = document.getElementById("realYieldInput");
const liquidityInput = document.getElementById("liquidityInput");
const safeHavenInput = document.getElementById("safeHavenInput");
const bankDemandInput = document.getElementById("bankDemandInput");
const fundFlowsInput = document.getElementById("fundFlowsInput");
const creditStressInput = document.getElementById("creditStressInput");
const scenarioLabelInput = document.getElementById("scenarioLabelInput");

const updateBtn = document.getElementById("updateBtn");
const resetBtn = document.getElementById("resetBtn");

const demandValueEl = document.getElementById("demandValue");
const flowValueEl = document.getElementById("flowValue");
const auctionValueEl = document.getElementById("auctionValue");
const positioningScoreValueEl = document.getElementById("positioningScoreValue");

const regimeValueEl = document.getElementById("regimeValue");
const regimeTextEl = document.getElementById("regimeText");
const interpretationTextEl = document.getElementById("interpretationText");

const institutionalStatusEl = document.getElementById("institutionalStatus");
const flowStatusEl = document.getElementById("flowStatus");
const auctionStatusEl = document.getElementById("auctionStatus");
const macroStatusEl = document.getElementById("macroStatus");

const scenarioTableBodyEl = document.getElementById("scenarioTableBody");

let profileChart = null;
let yieldChart = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatScore(value) {
  return Math.round(value);
}

function getInputs() {
  return {
    us10y: Number(us10yInput.value) || 0,
    us2y: Number(us2yInput.value) || 0,
    de10y: Number(de10yInput.value) || 0,
    uk10y: Number(uk10yInput.value) || 0,
    jp10y: Number(jp10yInput.value) || 0,
    realYield: Number(realYieldInput.value) || 0,
    liquidity: clamp(Number(liquidityInput.value) || 0, 0, 100),
    safeHaven: clamp(Number(safeHavenInput.value) || 0, 0, 100),
    bankDemand: clamp(Number(bankDemandInput.value) || 0, 0, 100),
    fundFlows: clamp(Number(fundFlowsInput.value) || 0, 0, 100),
    creditStress: clamp(Number(creditStressInput.value) || 0, 0, 100),
    label: scenarioLabelInput.value.trim()
  };
}

function calculateMetrics(data) {
  const curveSpread = data.us10y - data.us2y;
  const crossMarketDispersion =
    (Math.abs(data.us10y - data.de10y) +
      Math.abs(data.us10y - data.uk10y) +
      Math.abs(data.us10y - data.jp10y)) / 3;

  const institutionalDemandScore = clamp(
    (data.bankDemand * 0.60) + (data.safeHaven * 0.40),
    0,
    100
  );

  const flowPressureScore = clamp(
    (data.fundFlows * 0.55) +
      (data.liquidity * 0.25) +
      (crossMarketDispersion * 12),
    0,
    100
  );

  const auctionStressScore = clamp(
    (data.liquidity * 0.35) +
      (data.creditStress * 0.30) +
      (Math.max(0, data.us10y - 4.0) * 12) +
      (Math.max(0, -curveSpread) * 18),
    0,
    100
  );

  const realYieldPressureScore = clamp(
    data.realYield < 0 ? 10 :
    data.realYield < 1 ? 24 :
    data.realYield < 2 ? 42 :
    data.realYield < 3 ? 58 : 72,
    0,
    100
  );

  const positioningScore = clamp(
    (flowPressureScore * 0.28) +
      (auctionStressScore * 0.22) +
      (realYieldPressureScore * 0.20) +
      ((100 - institutionalDemandScore) * 0.15) +
      (data.creditStress * 0.15),
    0,
    100
  );

  return {
    curveSpread,
    crossMarketDispersion,
    institutionalDemandScore,
    flowPressureScore,
    auctionStressScore,
    realYieldPressureScore,
    positioningScore
  };
}

function getDemandLabel(score) {
  if (score >= 70) return { label: "Strong", className: "signal-positive" };
  if (score >= 45) return { label: "Supportive", className: "signal-neutral" };
  return { label: "Weak", className: "signal-danger" };
}

function getFlowLabel(score) {
  if (score >= 65) return { label: "Heavy Selling Pressure", className: "signal-danger" };
  if (score >= 40) return { label: "Mixed", className: "signal-caution" };
  return { label: "Orderly / Supportive", className: "signal-positive" };
}

function getAuctionLabel(score) {
  if (score >= 70) return { label: "Weak Demand Risk", className: "signal-danger" };
  if (score >= 40) return { label: "Contained", className: "signal-neutral" };
  return { label: "Stable", className: "signal-positive" };
}

function getMacroTone(metrics, data) {
  if (metrics.positioningScore >= 70) return { label: "Fragile", className: "signal-danger" };
  if (data.realYield >= 1.5 || metrics.flowPressureScore >= 45) return { label: "Cautious", className: "signal-caution" };
  return { label: "Balanced", className: "signal-positive" };
}

function classifyRegime(metrics, data) {
  if (metrics.positioningScore >= 75 || data.liquidity >= 75) {
    return {
      label: "Liquidity Stress",
      className: "regime-liquidity",
      text: "Funding and positioning conditions are deteriorating and the market is becoming more fragile."
    };
  }

  if (data.realYield >= 1.75 && metrics.flowPressureScore >= 40) {
    return {
      label: "Defensive",
      className: "regime-defensive",
      text: "Higher real yields and more cautious flows are pushing the market toward a more defensive posture."
    };
  }

  if (data.realYield >= 1.25 || Math.abs(metrics.curveSpread) < 0.20) {
    return {
      label: "Policy Transition",
      className: "regime-policy",
      text: "Cross-market yields remain elevated while institutional demand appears supportive and liquidity conditions are not yet disorderly."
    };
  }

  if (metrics.positioningScore < 35 && metrics.institutionalDemandScore >= 60) {
    return {
      label: "Risk-On",
      className: "regime-riskon",
      text: "Demand conditions appear constructive and positioning stress remains limited."
    };
  }

  return {
    label: "Neutral",
    className: "regime-neutral",
    text: "Bond market conditions are broadly balanced, with no dominant stress or demand regime."
  };
}

function buildInterpretation(data, metrics, regime) {
  const labelPart = data.label ? ` for ${data.label}` : "";

  if (regime.label === "Liquidity Stress") {
    return `The Flow & Positioning Engine${labelPart} points to a liquidity-stress regime. Auction conditions appear more fragile, flow pressure is elevated and institutional demand is no longer enough to fully offset broader market strain.`;
  }

  if (regime.label === "Defensive") {
    return `The Flow & Positioning Engine${labelPart} indicates a defensive regime. Real yields remain restrictive, positioning is becoming more cautious and the market appears more focused on protection than on duration risk-taking.`;
  }

  if (regime.label === "Policy Transition") {
    return `The Flow & Positioning Engine${labelPart} indicates a policy-transition regime. Rate levels remain elevated and the market appears to be balancing restrictive pricing against still-supportive structural demand.`;
  }

  if (regime.label === "Risk-On") {
    return `The Flow & Positioning Engine${labelPart} points to a risk-on regime. Demand remains constructive, flow pressure is relatively contained and the broader bond market structure appears orderly.`;
  }

  return `The Flow & Positioning Engine${labelPart} points to a neutral regime. Some signals remain cautious, but the overall bond market structure does not yet point to strong directional stress.`;
}

function updateUi(data, metrics, regime) {
  const demand = getDemandLabel(metrics.institutionalDemandScore);
  const flow = getFlowLabel(metrics.flowPressureScore);
  const auction = getAuctionLabel(metrics.auctionStressScore);
  const macro = getMacroTone(metrics, data);

  demandValueEl.textContent = demand.label;
  flowValueEl.textContent = flow.label;
  auctionValueEl.textContent = auction.label;
  positioningScoreValueEl.textContent = formatScore(metrics.positioningScore);

  regimeValueEl.textContent = regime.label;
  regimeValueEl.className = `hero-status-value ${regime.className}`;
  regimeTextEl.textContent = regime.text;

  interpretationTextEl.textContent = buildInterpretation(data, metrics, regime);

  institutionalStatusEl.textContent = demand.label;
  institutionalStatusEl.className = `signal-value ${demand.className}`;

  flowStatusEl.textContent = flow.label;
  flowStatusEl.className = `signal-value ${flow.className}`;

  auctionStatusEl.textContent = auction.label;
  auctionStatusEl.className = `signal-value ${auction.className}`;

  macroStatusEl.textContent = macro.label;
  macroStatusEl.className = `signal-value ${macro.className}`;
}

function buildProfileChart(metrics, data) {
  const ctx = document.getElementById("profileChart").getContext("2d");

  if (profileChart) {
    profileChart.destroy();
  }

  profileChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: [
        "Institutional Demand",
        "Flow Pressure",
        "Auction Stress",
        "Real Yield Pressure",
        "Credit Stress",
        "Safe-Haven Demand"
      ],
      datasets: [
        {
          label: "Current Profile",
          data: [
            metrics.institutionalDemandScore,
            metrics.flowPressureScore,
            metrics.auctionStressScore,
            metrics.realYieldPressureScore,
            data.creditStress,
            data.safeHaven
          ],
          borderWidth: 2,
          pointRadius: 3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false },
          pointLabels: { color: "#9db0c8" },
          grid: { color: "rgba(157,176,200,0.18)" },
          angleLines: { color: "rgba(157,176,200,0.18)" }
        }
      }
    }
  });
}

function buildYieldChart(data) {
  const ctx = document.getElementById("yieldChart").getContext("2d");

  if (yieldChart) {
    yieldChart.destroy();
  }

  yieldChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["US", "Germany", "UK", "Japan"],
      datasets: [
        {
          label: "10Y Yield",
          data: [data.us10y, data.de10y, data.uk10y, data.jp10y],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Yield: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#9db0c8" }
        },
        y: {
          ticks: {
            color: "#9db0c8",
            callback: function(value) {
              return `${value.toFixed(1)}%`;
            }
          },
          grid: { color: "rgba(157,176,200,0.15)" }
        }
      }
    }
  });
}

function buildScenarioTable(data) {
  const scenarios = [
    {
      name: "Base Case",
      bankDemand: data.bankDemand,
      fundFlows: data.fundFlows,
      liquidity: data.liquidity,
      creditStress: data.creditStress,
      realYield: data.realYield
    },
    {
      name: "Stronger Institutional Demand",
      bankDemand: data.bankDemand + 15,
      fundFlows: Math.max(data.fundFlows - 8, 0),
      liquidity: data.liquidity,
      creditStress: data.creditStress,
      realYield: data.realYield
    },
    {
      name: "Flow Deterioration",
      bankDemand: data.bankDemand,
      fundFlows: data.fundFlows + 20,
      liquidity: data.liquidity + 10,
      creditStress: data.creditStress + 8,
      realYield: data.realYield
    },
    {
      name: "Auction Stress Rising",
      bankDemand: Math.max(data.bankDemand - 10, 0),
      fundFlows: data.fundFlows + 10,
      liquidity: data.liquidity + 18,
      creditStress: data.creditStress + 15,
      realYield: data.realYield + 0.20
    },
    {
      name: "Defensive Safe-Haven Shift",
      bankDemand: data.bankDemand + 5,
      fundFlows: data.fundFlows - 6,
      liquidity: Math.max(data.liquidity - 5, 0),
      creditStress: data.creditStress + 4,
      realYield: data.realYield + 0.15
    }
  ];

  scenarioTableBodyEl.innerHTML = "";

  scenarios.forEach((scenario) => {
    const scenarioData = {
      ...data,
      bankDemand: clamp(scenario.bankDemand, 0, 100),
      fundFlows: clamp(scenario.fundFlows, 0, 100),
      liquidity: clamp(scenario.liquidity, 0, 100),
      creditStress: clamp(scenario.creditStress, 0, 100),
      realYield: scenario.realYield
    };

    const metrics = calculateMetrics(scenarioData);
    const regime = classifyRegime(metrics, scenarioData);
    const demand = getDemandLabel(metrics.institutionalDemandScore);
    const flow = getFlowLabel(metrics.flowPressureScore);
    const auction = getAuctionLabel(metrics.auctionStressScore);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${scenario.name}</td>
      <td>${demand.label}</td>
      <td>${flow.label}</td>
      <td>${auction.label}</td>
      <td>${regime.label}</td>
    `;
    scenarioTableBodyEl.appendChild(row);
  });
}

function updateEngine() {
  const data = getInputs();
  const metrics = calculateMetrics(data);
  const regime = classifyRegime(metrics, data);

  updateUi(data, metrics, regime);
  buildProfileChart(metrics, data);
  buildYieldChart(data);
  buildScenarioTable(data);
}

function resetEngine() {
  us10yInput.value = "4.20";
  us2yInput.value = "3.70";
  de10yInput.value = "2.98";
  uk10yInput.value = "4.79";
  jp10yInput.value = "2.27";
  realYieldInput.value = "1.83";
  liquidityInput.value = "42";
  safeHavenInput.value = "54";
  bankDemandInput.value = "61";
  fundFlowsInput.value = "48";
  creditStressInput.value = "36";
  scenarioLabelInput.value = "";

  updateEngine();
}

[
  us10yInput,
  us2yInput,
  de10yInput,
  uk10yInput,
  jp10yInput,
  realYieldInput,
  liquidityInput,
  safeHavenInput,
  bankDemandInput,
  fundFlowsInput,
  creditStressInput,
  scenarioLabelInput
].forEach((input) => {
  input.addEventListener("input", updateEngine);
});

updateBtn.addEventListener("click", updateEngine);
resetBtn.addEventListener("click", resetEngine);

document.addEventListener("DOMContentLoaded", updateEngine);
