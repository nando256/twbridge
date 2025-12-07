package net.nando256.turboagent.http;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import net.nando256.turboagent.TwBridgePlugin;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;

public final class StaticHttpServer {
    private final TwBridgePlugin plugin;
    private final String address;
    private final int port;
    private final String resourceBase;
    private final int cacheSeconds;
    private final Path externalRoot;
    private final Map<String, byte[]> overrides;
    private HttpServer server;

    public StaticHttpServer(TwBridgePlugin plugin,
                            String address,
                            int port,
                            String resourceBase,
                            int cacheSeconds,
                            Map<String, byte[]> overrides,
                            Path externalRoot) {
        this.plugin = plugin;
        this.address = (address == null || address.isBlank()) ? "0.0.0.0" : address;
        this.port = port;
        this.resourceBase = resourceBase == null ? "" : resourceBase;
        this.cacheSeconds = cacheSeconds;
        this.overrides = overrides == null ? Map.of() : overrides;
        this.externalRoot = externalRoot;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(address, port), 0);
        server.createContext("/", new ResourceHandler());
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
    }

    private final class ResourceHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            var uri = exchange.getRequestURI();
            var path = normalizePath(uri);
            if (path == null) {
                send(exchange, 400, "bad path");
                return;
            }
            // Accept both root and "/tw/" prefixed requests.
            if (path.startsWith("tw/")) {
                path = path.substring("tw/".length());
            }
            if (path.isEmpty() || path.endsWith("/")) {
                path = path + "index.html";
            }
            var resourcePath = resourceBase + path;
            byte[] bytes = overrides.get(path);
            if (bytes == null && externalRoot != null) {
                try {
                    var filePath = externalRoot.resolve(path).normalize();
                    if (!filePath.startsWith(externalRoot) || Files.isDirectory(filePath) || !Files.exists(filePath)) {
                        send(exchange, 404, "not found");
                        return;
                    }
                    bytes = Files.readAllBytes(filePath);
                } catch (Exception ignored) {}
            }
            try (InputStream is = bytes == null ? plugin.getResource(resourcePath) : null) {
                if (bytes == null) {
                    if (is == null) {
                        send(exchange, 404, "not found");
                        return;
                    }
                    bytes = is.readAllBytes();
                }
            }
            var headers = exchange.getResponseHeaders();
            headers.add("Content-Type", contentType(path));
            headers.add("Cache-Control", "public, max-age=" + cacheSeconds);
            setSecurityHeaders(headers);
            exchange.sendResponseHeaders(200, bytes.length);
            try (var os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }

        private String normalizePath(URI uri) {
            if (uri == null) return "";
            var raw = uri.getPath();
            if (raw == null) return "";
            var cleaned = raw.replace("..", "").replace("\\", "/");
            while (cleaned.startsWith("/")) cleaned = cleaned.substring(1);
            return cleaned;
        }

        private String contentType(String path) {
            String lower = path.toLowerCase(Locale.ROOT);
            for (Map.Entry<String, String> entry : MIME_MAP.entrySet()) {
                if (lower.endsWith(entry.getKey())) return entry.getValue();
            }
            return "application/octet-stream";
        }

        private void send(HttpExchange ex, int status, String msg) throws IOException {
            var bytes = msg.getBytes(StandardCharsets.UTF_8);
            setSecurityHeaders(ex.getResponseHeaders());
            ex.sendResponseHeaders(status, bytes.length);
            try (var os = ex.getResponseBody()) { os.write(bytes); }
        }

        private void setSecurityHeaders(Headers h) {
            h.add("X-Content-Type-Options", "nosniff");
            h.add("Access-Control-Allow-Origin", "*");
            h.add("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        }
    }

    private static final Map<String, String> MIME_MAP = Map.ofEntries(
        Map.entry(".html", "text/html; charset=utf-8"),
        Map.entry(".js", "application/javascript; charset=utf-8"),
        Map.entry(".css", "text/css; charset=utf-8"),
        Map.entry(".json", "application/json; charset=utf-8"),
        Map.entry(".png", "image/png"),
        Map.entry(".jpg", "image/jpeg"),
        Map.entry(".jpeg", "image/jpeg"),
        Map.entry(".gif", "image/gif"),
        Map.entry(".svg", "image/svg+xml"),
        Map.entry(".ico", "image/x-icon"),
        Map.entry(".woff2", "font/woff2"),
        Map.entry(".woff", "font/woff")
    );
}
