import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const tools = [
  {
    name: "calculator",
    description: "Perform arithmetic on two numbers: add, subtract, multiply, divide, modulo, or power",
    parameters: {
      a: "number",
      b: "number",
      operation: "string (add | subtract | multiply | divide | modulo | power)"
    }
  },
  {
    name: "weather",
    description: "Return fake weather for a given city",
    parameters: {
      city: "string"
    }
  },
  {
    name: "randomQuote",
    description: "Return an inspirational quote",
    parameters: {}
  },
  {
    name: "unitConverter",
    description: "Convert between common units (km/miles, kg/lbs, celsius/fahrenheit, liters/gallons)",
    parameters: {
      value: "number",
      from: "string (e.g. km, miles, kg, lbs, c, f, liters, gallons)",
      to: "string (e.g. km, miles, kg, lbs, c, f, liters, gallons)"
    }
  },
  {
    name: "passwordGenerator",
    description: "Generate a random password of a given length",
    parameters: {
      length: "number (8–128)",
    }
  },
  {
    name: "wordCounter",
    description: "Count the words and characters in a piece of text",
    parameters: {
      text: "string"
    }
  },
  {
    name: "currencyConverter",
    description: "Convert between currencies using mock exchange rates (USD, EUR, GBP, INR, JPY)",
    parameters: {
      amount: "number",
      from: "string (USD | EUR | GBP | INR | JPY)",
      to: "string (USD | EUR | GBP | INR | JPY)"
    }
  }
];

// GET /tools — all tools (basic list)
app.get("/tools", (_req, res) => {
  res.json({ tools });
});

// GET /tools/all — all tools with full details + metadata
app.get("/tools/all", (_req, res) => {
  const detailed = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameterCount: Object.keys(tool.parameters).length,
    parameters: Object.entries(tool.parameters).map(([key, type]) => ({
      name: key,
      type,
      required: true,
    })),
    exampleCall: {
      tool: tool.name,
      args: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, type]) => [
          key,
          type.includes("number") ? 0 : "example",
        ])
      ),
    },
  }));

  res.json({
    server: "MCP Server",
    version: "1.0.0",
    totalTools: tools.length,
    generatedAt: new Date().toISOString(),
    tools: detailed,
  });
});

// GET /tools/:name — single tool full details
app.get("/tools/:name", (req, res) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) {
    return res.status(404).json({ error: `Tool "${req.params.name}" not found` });
  }
  res.json({
    name: tool.name,
    description: tool.description,
    parameterCount: Object.keys(tool.parameters).length,
    parameters: Object.entries(tool.parameters).map(([key, type]) => ({
      name: key,
      type,
      required: true,
    })),
    exampleCall: {
      tool: tool.name,
      args: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, type]) => [
          key,
          type.includes("number") ? 0 : "example",
        ])
      ),
    },
  });
});

// GET /health — server health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: `${Math.floor(process.uptime())}s`,
    totalTools: tools.length,
    toolNames: tools.map((t) => t.name),
    timestamp: new Date().toISOString(),
  });
});

app.post("/invoke", (req, res) => {
  const { tool, args } = req.body || {};

  switch (tool) {
    // ── Existing tools ────────────────────────────────────────────────────────

    case "calculator": {
      const a = Number(args?.a);
      const b = Number(args?.b);
      const operation = String(args?.operation || "add").toLowerCase().trim();

      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return res.status(400).json({ error: "Both a and b must be numbers" });
      }

      const ops = ["add", "subtract", "multiply", "divide", "modulo", "power"];
      if (!ops.includes(operation)) {
        return res.status(400).json({ error: `Unknown operation: ${operation}. Use: ${ops.join(", ")}` });
      }
      if (operation === "divide" && b === 0) {
        return res.status(400).json({ error: "Cannot divide by zero" });
      }
      if (operation === "modulo" && b === 0) {
        return res.status(400).json({ error: "Cannot modulo by zero" });
      }

      const results = {
        add:      a + b,
        subtract: a - b,
        multiply: a * b,
        divide:   a / b,
        modulo:   a % b,
        power:    Math.pow(a, b),
      };

      return res.json({
        expression: `${a} ${{ add: "+", subtract: "-", multiply: "×", divide: "÷", modulo: "%", power: "^" }[operation]} ${b}`,
        result: results[operation],
        operation
      });
    }

    case "weather": {
      const city = String(args?.city || "").trim();
      if (!city) {
        return res.status(400).json({ error: "city is required" });
      }
      return res.json({ city, temperature: 32, condition: "Sunny", humidity: "45%" });
    }

    case "randomQuote": {
      return res.json({
        quote: "The only way to do great work is to love what you do.",
        author: "Steve Jobs"
      });
    }

    // ── New tools ─────────────────────────────────────────────────────────────

    case "unitConverter": {
      const value = Number(args?.value);
      const from = String(args?.from || "").toLowerCase().trim();
      const to   = String(args?.to   || "").toLowerCase().trim();

      if (!Number.isFinite(value)) {
        return res.status(400).json({ error: "value must be a number" });
      }

      // Conversion map: each entry converts TO a shared base unit (metres, kg, kelvin, litres)
      // then from base unit to target.
      const toBase = {
        km:      v => v * 1000,          // → metres
        miles:   v => v * 1609.344,
        m:       v => v,
        feet:    v => v * 0.3048,
        kg:      v => v,                 // → kg (already base)
        lbs:     v => v * 0.453592,
        g:       v => v / 1000,
        c:       v => v + 273.15,        // → kelvin
        f:       v => (v - 32) * 5/9 + 273.15,
        k:       v => v,
        liters:  v => v,                 // → litres (already base)
        gallons: v => v * 3.78541,
        ml:      v => v / 1000,
      };

      const fromBase = {
        km:      v => v / 1000,
        miles:   v => v / 1609.344,
        m:       v => v,
        feet:    v => v / 0.3048,
        kg:      v => v,
        lbs:     v => v / 0.453592,
        g:       v => v * 1000,
        c:       v => v - 273.15,
        f:       v => (v - 273.15) * 9/5 + 32,
        k:       v => v,
        liters:  v => v,
        gallons: v => v / 3.78541,
        ml:      v => v * 1000,
      };

      if (!toBase[from]) return res.status(400).json({ error: `Unknown unit: ${from}` });
      if (!fromBase[to]) return res.status(400).json({ error: `Unknown unit: ${to}` });

      const converted = fromBase[to](toBase[from](value));
      return res.json({
        input: `${value} ${from}`,
        result: `${Math.round(converted * 1e6) / 1e6} ${to}`
      });
    }

    case "passwordGenerator": {
      const length = Math.min(128, Math.max(8, Number(args?.length) || 16));
      if (!Number.isFinite(length)) {
        return res.status(400).json({ error: "length must be a number between 8 and 128" });
      }
      const charset =
        "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "0123456789" +
        "!@#$%^&*()-_=+[]{}|;:,.<>?";
      let password = "";
      for (let i = 0; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
      return res.json({ password, length });
    }

    case "wordCounter": {
      const text = String(args?.text || "");
      if (!text.trim()) {
        return res.status(400).json({ error: "text is required" });
      }
      const words      = text.trim().split(/\s+/).filter(Boolean).length;
      const chars      = text.length;
      const charsNoSp  = text.replace(/\s/g, "").length;
      const sentences  = text.split(/[.!?]+/).filter(s => s.trim()).length;
      const paragraphs = text.split(/\n{2,}/).filter(p => p.trim()).length;
      return res.json({ words, characters: chars, charactersNoSpaces: charsNoSp, sentences, paragraphs });
    }

    case "currencyConverter": {
      const amount = Number(args?.amount);
      const from   = String(args?.from || "").toUpperCase().trim();
      const to     = String(args?.to   || "").toUpperCase().trim();

      if (!Number.isFinite(amount)) {
        return res.status(400).json({ error: "amount must be a number" });
      }

      // Mock rates relative to USD
      const ratesFromUSD = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5 };

      if (!ratesFromUSD[from]) return res.status(400).json({ error: `Unsupported currency: ${from}` });
      if (!ratesFromUSD[to])   return res.status(400).json({ error: `Unsupported currency: ${to}` });

      const inUSD    = amount / ratesFromUSD[from];
      const result   = inUSD * ratesFromUSD[to];
      const rate     = ratesFromUSD[to] / ratesFromUSD[from];

      return res.json({
        input: `${amount} ${from}`,
        result: `${Math.round(result * 100) / 100} ${to}`,
        rate: `1 ${from} = ${Math.round(rate * 10000) / 10000} ${to}`,
        note: "Mock exchange rates — not real-time"
      });
    }

    default:
      return res.status(400).json({ error: "Unknown tool" });
  }
});

app.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
});
