package net.nando256.twbridge.http;

import com.sun.net.httpserver.*;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public final class TwHttpServer {
    private final JavaPlugin plugin;
    private final String address; private final int port;
    private final String path;    private final List<String> corsAllowOrigins;
    private final int cacheSeconds;
    private final String wsDefault;
    private HttpServer server;
    private String jsTemplate;
    private final ConcurrentHashMap<String, JsVariant> variantCache = new ConcurrentHashMap<>();
    private static final Pattern WS_DEFAULT_PATTERN = Pattern.compile("const WS_DEFAULT = \"[^\"]+\";");
    private static final Pattern LANG_CONST_PATTERN = Pattern.compile("const TWB_DEFAULT_LANG = \"[^\"]*\";");
    private static final Pattern LANG_SANITIZE_PATTERN = Pattern.compile("^[a-z0-9]{2,8}(?:-[a-z0-9]{1,8})*$");

    public TwHttpServer(JavaPlugin plugin, String address, int port, String path,
                        List<String> corsAllowOrigins, int cacheSeconds,
                        String wsDefault) {
        this.plugin = plugin;
        this.address = address; this.port = port;
        this.path = (path==null||path.isBlank())?"/tw/twbridge.js":path;
        this.corsAllowOrigins = corsAllowOrigins;
        this.cacheSeconds = Math.max(0, cacheSeconds);
        this.wsDefault = wsDefault;
    }

    public void start() throws IOException {
        try (InputStream is = plugin.getResource("turbowarp/twbridge.js")) {
            if (is == null) throw new IOException("resource turbowarp/twbridge.js not found");
            jsTemplate = loadTemplate(is);
        }
        variantCache.clear();
        server = HttpServer.create(new InetSocketAddress(address, port), 0);
        server.createContext("/", this::root);
        server.createContext(path, this::serveJs);

        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
    }

    public void stop(){ if (server!=null){ server.stop(0); server=null; } }

    private void root(HttpExchange x) throws IOException {
        var body = ("twbridge HTTP up.\nGET " + path + "\n").getBytes(StandardCharsets.UTF_8);
        setCommon(x.getResponseHeaders());
        x.sendResponseHeaders(200, body.length);
        try (var os = x.getResponseBody()) { os.write(body); }
    }

    private void serveJs(HttpExchange x) throws IOException {
        setCommon(x.getResponseHeaders());
        x.getResponseHeaders().add("Content-Type","text/javascript; charset=utf-8");
        x.getResponseHeaders().add("Cache-Control","public, max-age="+cacheSeconds);
        var langParam = extractLang(x.getRequestURI());
        var variant = variantCache.computeIfAbsent(langParam, this::buildVariant);
        x.getResponseHeaders().add("ETag", variant.etag());

        if (Objects.equals(x.getRequestMethod(),"OPTIONS")) {
            x.getResponseHeaders().add("Access-Control-Allow-Methods","GET, HEAD, OPTIONS");
            x.getResponseHeaders().add("Access-Control-Allow-Headers","Content-Type");
            x.sendResponseHeaders(204, -1); x.close(); return;
        }
        var inm = x.getRequestHeaders().getFirst("If-None-Match");
        if (inm!=null && inm.equals(variant.etag()) && Objects.equals(x.getRequestMethod(),"GET")) { x.sendResponseHeaders(304, -1); x.close(); return; }

        boolean head = Objects.equals(x.getRequestMethod(),"HEAD");
        long len = variant.bytes().length;
        x.sendResponseHeaders(200, head ? -1 : len);
        if (!head) {
            try (var os = x.getResponseBody()) { os.write(variant.bytes()); }
        } else {
            x.close();
        }
    }

    private void setCommon(Headers h) {
        if (corsAllowOrigins!=null && !corsAllowOrigins.isEmpty()) h.add("Access-Control-Allow-Origin", corsAllowOrigins.get(0));
        h.add("X-Content-Type-Options","nosniff");
    }
    private static String calcEtag(byte[] d){
        try{ var md=MessageDigest.getInstance("SHA-256"); return "\"sha256-"+ Base64.getUrlEncoder().withoutPadding().encodeToString(md.digest(d))+"\""; }
        catch(Exception e){ return "\""+d.length+"\""; }
    }

    private String loadTemplate(InputStream is) throws IOException {
        var raw = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        if (wsDefault == null || wsDefault.isBlank()) return raw;
        var matcher = WS_DEFAULT_PATTERN.matcher(raw);
        if (!matcher.find()) return raw;
        var safe = escapeForJs(wsDefault);
        return matcher.replaceFirst("const WS_DEFAULT = \"" + safe + "\";");
    }

    private JsVariant buildVariant(String requestedLang) {
        var lang = sanitizeLang(requestedLang);
        var matcher = LANG_CONST_PATTERN.matcher(jsTemplate);
        var safe = escapeForJs(lang);
        var replaced = matcher.find()
            ? matcher.replaceFirst("const TWB_DEFAULT_LANG = \"" + safe + "\";")
            : jsTemplate;
        var bytes = replaced.getBytes(StandardCharsets.UTF_8);
        return new JsVariant(bytes, calcEtag(bytes));
    }

    private String sanitizeLang(String rawLang) {
        if (rawLang == null) return "en";
        var normalized = rawLang.trim().replace('_','-').toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) return "en";
        if (normalized.length() > 32) return "en";
        if (!LANG_SANITIZE_PATTERN.matcher(normalized).matches()) return "en";
        return normalized;
    }

    private String extractLang(URI uri) {
        if (uri == null) return "en";
        var query = uri.getRawQuery();
        if (query == null || query.isEmpty()) return "en";
        for (String part : query.split("&")) {
            if (part.isEmpty()) continue;
            int eq = part.indexOf('=');
            String key = eq >= 0 ? part.substring(0, eq) : part;
            if (!"lang".equalsIgnoreCase(decodeSafe(key))) continue;
            String value = eq >= 0 ? part.substring(eq + 1) : "";
            return sanitizeLang(decodeSafe(value));
        }
        return "en";
    }

    private String decodeSafe(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
    }

    private static String escapeForJs(String input) {
        return input.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private record JsVariant(byte[] bytes, String etag) {}
}
