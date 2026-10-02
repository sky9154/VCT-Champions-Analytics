import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer, request as createRequest } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";


const HOST = "0.0.0.0";
const PORT = 5577;
const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8591;
const FRONTEND_DIR = fileURLToPath(new URL(".", import.meta.url));
const DIST_DIR = resolve(FRONTEND_DIR, "dist");
const INDEX_PATH = resolve(DIST_DIR, "index.html");
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".eot", "application/vnd.ms-fontobject"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".otf", "font/otf"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".wasm", "application/wasm"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"]
]);
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};
const VIRTUAL_INTERFACE_NAME = /virtual|vmware|virtualbox|vboxnet|hyper-v|vEthernet|wsl|docker|loopback|bridge|\bbr\d+\b|virbr\d*|tunnel|\btap\d*\b|\btun\d*\b|vpn|tailscale|wireguard|\bwg\d+\b|zerotier|hamachi|bluetooth|isatap|teredo|local area connection\*/i;

const toIpv4Number = (address) => {
  if (typeof address !== "string") {
    return null;
  }

  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets.reduce((value, octet) => (value * 256) + octet, 0);
};

const isPrivateIpv4 = (address) => {
  const [first, second] = address.split(".").map(Number);
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
};

const isUsablePrivateAddress = (entry) => {
  if (!isPrivateIpv4(entry.address)) {
    return false;
  }

  const addressNumber = toIpv4Number(entry.address);
  const netmaskNumber = toIpv4Number(entry.netmask);
  if (addressNumber === null || netmaskNumber === null || netmaskNumber === 0) {
    return false;
  }

  const networkNumber = (addressNumber & netmaskNumber) >>> 0;
  const broadcastNumber = (networkNumber | (~netmaskNumber >>> 0)) >>> 0;

  return addressNumber !== networkNumber && addressNumber !== broadcastNumber;
};

const getPrivateIpv4Addresses = () => (
  Object.entries(networkInterfaces())
    .filter(([interfaceName]) => !VIRTUAL_INTERFACE_NAME.test(interfaceName))
    .flatMap(([, addresses]) => addresses ?? [])
    .filter((entry) => (entry.family === "IPv4" || entry.family === 4)
      && !entry.internal
      && !entry.address.startsWith("127.")
      && !entry.address.startsWith("169.254.")
      && isUsablePrivateAddress(entry))
    .map((entry) => entry.address)
    .filter((address, index, allAddresses) => allAddresses.indexOf(address) === index)
    .sort((left, right) => {
      const leftNumber = toIpv4Number(left) ?? 0;
      const rightNumber = toIpv4Number(right) ?? 0;
      return leftNumber - rightNumber;
    })
);

const sendJson = (request, response, statusCode, payload) => {
  const body = Buffer.from(JSON.stringify(payload));

  setSecurityHeaders(response);

  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(request.method === "HEAD" ? undefined : body);
};

const sendNotFound = (request, response) => {
  sendJson(request, response, 404, {
    error: {
      code: "NOT_FOUND",
      message: "找不到要求的前端檔案。"
    }
  });
};

const setSecurityHeaders = (response) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
};

const getRawPathname = (requestUrl) => {
  const queryIndex = requestUrl.indexOf("?");

  return queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);
};

const isApiRequest = (pathname) => (
  pathname === "/api" || pathname.startsWith("/api/")
);

const acceptsHtml = (acceptHeader) => (
  (Array.isArray(acceptHeader) ? acceptHeader.join(",") : acceptHeader ?? "").split(",").some((entry) => {
    const [mediaType, ...parameters] = entry.trim().split(";");

    return mediaType.toLowerCase() === "text/html"
      && !parameters.some((parameter) => /^q\s*=\s*0(?:\.0*)?$/i.test(parameter.trim()));
  })
);

const isDevelopmentPath = (pathname) => (
  /^\/(?:@vite(?:\/|$)|@id(?:\/|$)|@fs(?:\/|$)|src(?:\/|$))/.test(pathname)
);

const isSpaNavigation = (request, pathname) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const fetchMode = request.headers["sec-fetch-mode"];
  const fetchDestination = request.headers["sec-fetch-dest"];

  if ((fetchMode && fetchMode !== "navigate")
    || (fetchDestination && fetchDestination !== "document")) {
    return false;
  }

  const isAssetPath = pathname === "/assets" || pathname.startsWith("/assets/");
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);

  return !isAssetPath
    && !isDevelopmentPath(pathname)
    && extname(lastSegment) === ""
    && acceptsHtml(request.headers.accept);
};

const isWithinDist = (filePath, realDistPath) => {
  const relativePath = relative(realDistPath, filePath);

  return relativePath !== ".."
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath);
};

const getCacheControl = (relativePath) => {
  if (relativePath === "index.html") {
    return "no-cache";
  }

  const normalizedPath = relativePath.split(sep).join("/");
  const isHashedAsset = normalizedPath.startsWith("assets/")
    && /-[A-Za-z0-9_-]{8,}\.[^./\\]+$/.test(normalizedPath);

  return isHashedAsset ? "public, max-age=31536000, immutable" : "public, max-age=300";
};

const sendFile = async (request, response, filePath, relativePath, requestPath, realDistPath, isFallback = false) => {
  let resolvedPath;
  let fileInfo;

  try {
    resolvedPath = await realpath(filePath);

    if (!isWithinDist(resolvedPath, realDistPath)) {
      sendNotFound(request, response);
      return;
    }

    fileInfo = await stat(resolvedPath);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      if (!isFallback && isSpaNavigation(request, requestPath)) {
        await sendFile(request, response, INDEX_PATH, "index.html", requestPath, realDistPath, true);

        return;
      }

      sendNotFound(request, response);

      return;
    }

    sendJson(request, response, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "目前無法提供前端檔案。"
      }
    });
    return;
  }

  if (!fileInfo.isFile()) {
    sendNotFound(request, response);
    return;
  }

  const contentType = MIME_TYPES.get(extname(resolvedPath).toLowerCase()) ?? "application/octet-stream";
  setSecurityHeaders(response);

  response.writeHead(200, {
    "Cache-Control": getCacheControl(relativePath),
    "Content-Length": fileInfo.size,
    "Content-Type": contentType,
    "Last-Modified": fileInfo.mtime.toUTCString()
  });

  if (request.method === "HEAD") {
    response.end();

    return;
  }

  const fileStream = createReadStream(resolvedPath);
  fileStream.on("error", () => {
    if (response.headersSent) {
      response.destroy();

      return;
    }

    sendJson(request, response, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "目前無法提供前端檔案。"
      }
    });
  });
  fileStream.pipe(response);
};

const getProxyHeaders = (headers) => {
  const connectionHeader = headers.connection;
  const connectionValue = Array.isArray(connectionHeader)
    ? connectionHeader.join(",")
    : connectionHeader ?? "";
  const connectionTokens = connectionValue
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const excludedHeaders = new Set([...HOP_BY_HOP_HEADERS, ...connectionTokens, "host"]);
  const forwardedHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && !excludedHeaders.has(name.toLowerCase())) {
      forwardedHeaders[name] = value;
    }
  }

  return forwardedHeaders;
};

const proxyApiRequest = (request, response) => {
  const upstreamRequest = createRequest({
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    method: request.method,
    path: request.url,
    headers: {
      ...getProxyHeaders(request.headers),
      host: `${BACKEND_HOST}:${BACKEND_PORT}`
    }
  }, (upstreamResponse) => {
    const responseHeaders = getProxyHeaders(upstreamResponse.headers);

    for (const [name, value] of Object.entries(responseHeaders)) {
      response.setHeader(name, value);
    }

    setSecurityHeaders(response);
    response.writeHead(upstreamResponse.statusCode ?? 502);

    if (request.method === "HEAD") {
      upstreamResponse.destroy();
      response.end();
      return;
    }

    upstreamResponse.pipe(response);
  });

  upstreamRequest.on("error", () => {
    if (response.headersSent) {
      response.destroy();

      return;
    }

    sendJson(request, response, 502, {
      error: {
        code: "INTERNAL_ERROR",
        message: "後端服務目前無法連線，請稍後重試。"
      }
    });
  });

  request.on("aborted", () => upstreamRequest.destroy());
  response.on("close", () => {
    if (!response.writableEnded) {
      upstreamRequest.destroy();
    }
  });

  request.pipe(upstreamRequest);
};

const startServer = async () => {
  let realDistPath;
  let realIndexPath;

  try {
    realDistPath = await realpath(DIST_DIR);
    realIndexPath = await realpath(INDEX_PATH);

    const indexInfo = await stat(realIndexPath);

    if (!indexInfo.isFile() || !isWithinDist(realIndexPath, realDistPath)) {
      throw new Error("Production index file is unavailable.");
    }
  } catch {
    console.error("尚未建立正式前端檔案，請先執行 npm run build。");
    process.exitCode = 1;
    return;
  }

  const server = createServer((request, response) => {
    const requestUrl = request.url ?? "/";
    const rawPathname = getRawPathname(requestUrl);

    if (!rawPathname.startsWith("/") || rawPathname.startsWith("//")) {
      sendJson(request, response, 400, {
        error: { code: "INVALID_PARAMETER", message: "要求的路徑格式無效。" }
      });
      return;
    }

    if (isApiRequest(rawPathname)) {
      proxyApiRequest(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");

      sendJson(request, response, 405, {
        error: { code: "INVALID_PARAMETER", message: "此前端路徑不支援要求的方法。" }
      });

      return;
    }

    let decodedPathname;

    try {
      decodedPathname = decodeURIComponent(rawPathname);
    } catch {
      sendJson(request, response, 400, {
        error: { code: "INVALID_PARAMETER", message: "要求的路徑格式無效。" }
      });
      return;
    }

    if (decodedPathname.includes("\\")
      || decodedPathname.includes("\0")
      || decodedPathname.split("/").some((segment) => segment === "." || segment === "..")) {
      sendJson(request, response, 400, {
        error: { code: "INVALID_PARAMETER", message: "要求的路徑格式無效。" }
      });

      return;
    }

    if (isDevelopmentPath(decodedPathname)) {
      sendNotFound(request, response);

      return;
    }

    const relativePath = decodedPathname.replace(/^\/+/, "") || "index.html";
    const filePath = resolve(DIST_DIR, relativePath);

    if (!isWithinDist(filePath, DIST_DIR)) {
      sendNotFound(request, response);

      return;
    }

    void (async () => {
      try {
        await sendFile(request, response, filePath, relativePath, decodedPathname, realDistPath);
      } catch {
        if (!response.headersSent) {
          sendJson(request, response, 500, {
            error: {
              code: "INTERNAL_ERROR",
              message: "目前無法提供前端檔案。"
            }
          });
        } else {
          response.destroy();
        }
      }
    })();
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error("前端連接埠 5577 已被占用；請確認目前服務狀態。本程式不會終止占用連接埠的程序。");
    } else {
      console.error("正式前端服務無法啟動。");
    }
    process.exitCode = 1;
  });

  server.listen(PORT, HOST, () => {
    console.log(`正式前端服務已啟動（本機）：http://127.0.0.1:${PORT}`);

    const privateIpv4Addresses = getPrivateIpv4Addresses();

    if (privateIpv4Addresses.length === 0) {
      console.log("未偵測到可用的私人 IPv4 內網位址。");
    } else {
      for (const address of privateIpv4Addresses) {
        console.log(`內網存取：http://${address}:${PORT}`);
      }
    }

    console.log("按 Ctrl+C 可正常關閉服務。");
  });

  let isClosing = false;
  const handleShutdown = () => {
    if (isClosing) {
      return;
    }

    isClosing = true;

    server.close(() => {
      console.log("正式前端服務已關閉。");
    });
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
};

await startServer();