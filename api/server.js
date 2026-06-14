import { createRequestHandler } from "@react-router/node";

let requestHandler;

// Convert a Node.js Readable (req) to a Web ReadableStream
function nodeToWebStream(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
  });
}

// Pipe a Web ReadableStream to a Node.js Writable (res)
async function writeWebStreamToNode(webStream, nodeStream) {
  const reader = webStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      nodeStream.write(value);
    }
  } finally {
    reader.releaseLock();
    nodeStream.end();
  }
}

// Vercel Node.js serverless function — (req, res) signature required
export default async function handler(req, res) {
  if (!requestHandler) {
    const build = await import("../build/server/index.js");
    requestHandler = createRequestHandler({ build, mode: "production" });
  }

  const url = new URL(req.url, `https://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue;
    if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    else headers.append(key, val);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    ...(hasBody && { body: nodeToWebStream(req), duplex: "half" }),
  });

  const response = await requestHandler(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (response.body) {
    await writeWebStreamToNode(response.body, res);
  } else {
    res.end();
  }
}

export const config = { maxDuration: 30 };
