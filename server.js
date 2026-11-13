
const http = require("http");

const PORT = process.env.PORT || 3000;
const API_URL = process.env.AI_API_URL;
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "default";

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // CORS: configurar el dominio de la aplicación
  const allowedOrigin = process.env.APP_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: "online",
      project: "NEXUS WA",
      version: "1.0.0"
    }));
  }

  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404);
    return res.end(JSON.stringify({
      error: "Ruta no encontrada"
    }));
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 20000) {
        res.writeHead(413);
        return res.end(JSON.stringify({
          error: "Solicitud demasiado grande"
        }));
      }
    }

    const data = JSON.parse(body);
    const message = String(data.message || "").trim();

    if (!message || message.length > 5000) {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "Mensaje vacío o demasiado largo"
      }));
    }

    if (!API_URL || !API_KEY) {
      res.writeHead(503);
      return res.end(JSON.stringify({
        error: "La IA todavía no está configurada en el servidor"
      }));
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Sos el asistente inteligente de NEXUS WA. Respondé en español, con claridad, profesionalismo y utilidad."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error del proveedor:", response.status);
      res.writeHead(502);
      return res.end(JSON.stringify({
        error: "El proveedor de IA no pudo procesar la solicitud"
      }));
    }

    const answer =
      result.choices?.[0]?.message?.content;

    if (!answer) {
      res.writeHead(502);
      return res.end(JSON.stringify({
        error: "La IA devolvió una respuesta vacía"
      }));
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      answer
    }));

  } catch (error) {
    console.error(error.message);
    res.writeHead(500);
    res.end(JSON.stringify({
      error: "Error interno del servidor"
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NEXUS WA activo en el puerto ${PORT}`);
});
