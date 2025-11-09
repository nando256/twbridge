package net.nando256.twbridge.ws;

import net.nando256.twbridge.TwBridgePlugin;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class BridgeServer extends WebSocketServer {
    private final TwBridgePlugin plugin;
    private final Map<WebSocket, Integer> counters = new ConcurrentHashMap<>();
    private final Map<WebSocket, Session> sessions = new ConcurrentHashMap<>();
    private final Timer timer = new Timer(true);
    private final java.security.SecureRandom rng = new java.security.SecureRandom();

    private final boolean pairingRequired;
    private final int pairWindowSeconds;
    private final int maxMsgPerSec;
    private final int maxMsgBytes;
    private final java.util.Set<String> allowedOrigins;

    private volatile String activePairCode = null;
    private volatile long pairExpireAt = 0L;

    public BridgeServer(TwBridgePlugin plugin,
                        String host, int port,
                        java.util.Set<String> allowedOrigins,
                        int maxMsgPerSec, int maxMsgBytes,
                        boolean pairingRequired, int pairWindowSeconds) {
        super(new InetSocketAddress(host, port));
        this.plugin = plugin;
        this.allowedOrigins = allowedOrigins;
        this.maxMsgPerSec = maxMsgPerSec;
        this.maxMsgBytes = maxMsgBytes;
        this.pairingRequired = pairingRequired;
        this.pairWindowSeconds = pairWindowSeconds;

        timer.scheduleAtFixedRate(new TimerTask() {
            @Override public void run() {
                counters.replaceAll((k,v) -> 0);
            }
        }, 1000, 1000);

        if (pairingRequired) rotatePairCode();
    }

    public String rotatePairCode() {
        if (!pairingRequired) return null;
        this.activePairCode = String.format("%06d", rng.nextInt(1_000_000));
        this.pairExpireAt = System.currentTimeMillis() + pairWindowSeconds * 1000L;
        plugin.getLogger().info("[twbridge] Pairing code: " + activePairCode + " (valid " + pairWindowSeconds + "s)");
        return activePairCode;
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake hs) {
        InetAddress addr = conn.getRemoteSocketAddress().getAddress();
        if (addr == null) {
            conn.close(1008, "address unknown");
            return;
        }
        if (!isOriginAllowed(hs.getFieldValue("Origin"))) {
            conn.close(1008, "origin not allowed");
            return;
        }
        plugin.getLogger().info("[twbridge] WS connected: " + conn.getRemoteSocketAddress());
        plugin.logDebug("Connection opened: " + conn.getRemoteSocketAddress());
        counters.put(conn, 0);
        sendJson(conn, new JSONObject().put("hello", "twbridge").put("pairing", pairingRequired));
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.length() > maxMsgBytes) { conn.close(1009, "msg too large"); return; }
        counters.compute(conn, (k,v) -> v == null ? 1 : v + 1);
        if (counters.get(conn) > maxMsgPerSec) { conn.close(1011, "rate limit"); return; }

        try {
            var json = new JSONObject(message);
            var id = UUID.fromString(json.optString("id", UUID.randomUUID().toString()));
            var cmd = json.optString("cmd", "");

            if ("pair.start".equals(cmd)) {
                if (!pairingRequired) {
                    ok(conn, id, new JSONObject().put("sessionId", UUID.randomUUID().toString()));
                    return;
                }
                var code = json.optString("code", "");
                var now = System.currentTimeMillis();
                if (!code.equals(activePairCode) || now > pairExpireAt) {
                    err(conn, id, "invalid or expired code");
                    conn.close(1008, "invalid or expired code");
                    return;
                }
                var sessId = UUID.randomUUID().toString();
                sessions.put(conn, new Session(sessId, now));
                activePairCode = null; pairExpireAt = 0L;
                ok(conn, id, new JSONObject().put("sessionId", sessId));
                plugin.logDebug("Session established for " + conn.getRemoteSocketAddress());
                return;
            }

            if (pairingRequired && !requireActiveSession(conn, json)) {
                err(conn, id, "not paired");
                conn.close(1008, "pairing required");
                return;
            }

            if ("command.run".equals(cmd)) {
                var command = json.optString("command", "").trim();
                if (command.isEmpty()) { err(conn, id, "command missing"); return; }
                plugin.logDebug("command.run: " + command);
                plugin.handleCommand(command,
                    () -> ok(conn, id, null),
                    (msg) -> err(conn, id, msg == null ? "command failed" : msg));
                return;
            }

            if ("agent.teleportToPlayer".equals(cmd)) {
                var agentId = json.optString("agentId", "").trim();
                var owner = json.optString("player", "").trim();
                if (agentId.isEmpty() || owner.isEmpty()) {
                    err(conn, id, "agentId and player required");
                    return;
                }
                plugin.logDebug("agent.teleportToPlayer id=" + agentId + " player=" + owner);
                plugin.handleAgentTeleportToPlayer(
                    agentId,
                    owner,
                    () -> ok(conn, id, null),
                    (msg) -> err(conn, id, msg == null ? "teleport failed" : msg)
                );
                return;
            }

            if ("agent.despawn".equals(cmd)) {
                var agentId = json.optString("agentId", "").trim();
                var owner = json.optString("player", "").trim();
                if (agentId.isEmpty() || owner.isEmpty()) {
                    err(conn, id, "agentId and player required");
                    return;
                }
                plugin.logDebug("agent.despawn id=" + agentId + " player=" + owner);
                plugin.handleAgentDespawn(
                    agentId,
                    owner,
                    () -> ok(conn, id, null),
                    (msg) -> err(conn, id, msg == null ? "despawn failed" : msg)
                );
                return;
            }

            err(conn, id, "unknown cmd: " + cmd);
        } catch (Exception e) {
            conn.close(1011, "bad message");
        }
    }

    private boolean requireActiveSession(WebSocket conn, JSONObject json) {
        if (!pairingRequired) return true;
        var session = sessions.get(conn);
        return session != null && json.optString("sessionId", "").equals(session.sessionId());
    }

    private void sendJson(WebSocket conn, JSONObject obj) { conn.send(obj.toString()); }

    private void ok(WebSocket conn, UUID id, JSONObject res) {
        var payload = new JSONObject().put("id", id.toString()).put("ok", true);
        if (res != null) payload.put("result", res);
        sendJson(conn, payload);
    }

    private void err(WebSocket conn, UUID id, String msg) {
        sendJson(conn, new JSONObject().put("id", id.toString()).put("ok", false).put("error", msg));
    }

    private boolean isOriginAllowed(String origin) {
        if (origin == null || origin.isBlank()) return true;
        if (allowedOrigins.isEmpty()) return true;
        if (allowedOrigins.contains("*")) return true;
        return allowedOrigins.contains(origin);
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        plugin.getLogger().info("[twbridge] WS disconnected: " + conn.getRemoteSocketAddress() + " code=" + code + " reason=" + reason);
        counters.remove(conn);
        sessions.remove(conn);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        var message = ex == null ? "unknown" : ex.getMessage();
        plugin.getLogger().warning("[twbridge] WS error: " + message);
    }

    @Override
    public void onStart() {
        plugin.getLogger().info("[twbridge] BridgeServer listening on " + getAddress());
    }

    private record Session(String sessionId, long createdAt) {}
}
