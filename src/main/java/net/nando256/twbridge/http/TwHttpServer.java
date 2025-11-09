package net.nando256.twbridge.http;

import com.sun.net.httpserver.*;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

public final class TwHttpServer {
    private final JavaPlugin plugin;
    private final String address; private final int port;
    private final String path;    private final List<String> corsAllowOrigins;
    private final int cacheSeconds;
    private final String wsDefault;
    private HttpServer server;    private byte[] jsBytes; private String etag;

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
            jsBytes = prepareJsBytes(is);
        }
        etag = calcEtag(jsBytes);
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
        x.getResponseHeaders().add("ETag", etag);

        if (Objects.equals(x.getRequestMethod(),"OPTIONS")) {
            x.getResponseHeaders().add("Access-Control-Allow-Methods","GET, HEAD, OPTIONS");
            x.getResponseHeaders().add("Access-Control-Allow-Headers","Content-Type");
            x.sendResponseHeaders(204, -1); x.close(); return;
        }
        var inm = x.getRequestHeaders().getFirst("If-None-Match");
        if (inm!=null && inm.equals(etag) && Objects.equals(x.getRequestMethod(),"GET")) { x.sendResponseHeaders(304, -1); x.close(); return; }

        long len = Objects.equals(x.getRequestMethod(),"HEAD")? -1 : jsBytes.length;
        x.sendResponseHeaders(200, len);
        if (!Objects.equals(x.getRequestMethod(),"HEAD")) try (var os = x.getResponseBody()) { os.write(jsBytes); } else x.close();
    }

    private void setCommon(Headers h) {
        if (corsAllowOrigins!=null && !corsAllowOrigins.isEmpty()) h.add("Access-Control-Allow-Origin", corsAllowOrigins.get(0));
        h.add("X-Content-Type-Options","nosniff");
    }
    private static String calcEtag(byte[] d){
        try{ var md=MessageDigest.getInstance("SHA-256"); return "\"sha256-"+ Base64.getUrlEncoder().withoutPadding().encodeToString(md.digest(d))+"\""; }
        catch(Exception e){ return "\""+d.length+"\""; }
    }

    private byte[] prepareJsBytes(InputStream is) throws IOException {
        var raw = is.readAllBytes();
        if (wsDefault == null || wsDefault.isBlank()) return raw;
        var contents = new String(raw, StandardCharsets.UTF_8);
        var matcher = Pattern.compile("const WS_DEFAULT = \"[^\"]+\";").matcher(contents);
        if (!matcher.find()) return raw;
        var safe = wsDefault.replace("\\", "\\\\").replace("\"", "\\\"");
        var replaced = matcher.replaceFirst("const WS_DEFAULT = \"" + safe + "\";");
        return replaced.getBytes(StandardCharsets.UTF_8);
    }
}
