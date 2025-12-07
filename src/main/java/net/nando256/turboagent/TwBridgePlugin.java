package net.nando256.turboagent;

import net.nando256.turboagent.http.StaticHttpServer;
import net.nando256.turboagent.ws.BridgeServer;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Player;
import org.bukkit.entity.EntityType;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.player.PlayerInteractAtEntityEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;
import org.bukkit.inventory.meta.SkullMeta;
import org.bukkit.inventory.meta.SpawnEggMeta;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.util.EulerAngle;
import org.bukkit.util.Vector;
import org.bukkit.Sound;
import org.json.JSONObject;
import net.md_5.bungee.api.chat.ClickEvent;
import net.md_5.bungee.api.chat.ComponentBuilder;
import net.md_5.bungee.api.chat.HoverEvent;
import net.md_5.bungee.api.chat.TextComponent;

import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

public final class TwBridgePlugin extends JavaPlugin implements Listener {
    private BridgeServer wsServer;
    private StaticHttpServer httpServer;
    private final Map<String, AgentEntry> agents = new ConcurrentHashMap<>();
    private final Map<String, AgentInventory> agentInventories = new ConcurrentHashMap<>();
    private final Map<String, MagicToken> magicTokens = new ConcurrentHashMap<>();
    private final SecureRandom tokenRng = new SecureRandom();
    private boolean debug;
    private boolean magicLinkEnabled;
    private boolean requireSession;
    private boolean allowLegacyPairing;
    private int magicTokenTtlSeconds;
    private String magicLinkBaseUrl;
    private String magicLinkExtensionTemplate;
    private String wsBindAddress;
    private int wsPort;
    private boolean httpEnabled;
    private String httpBindAddress;
    private int httpPort;
    private String defaultLang;
    private String promptLangDefault = "en";
    private String defaultBranch;
    private String blockChoicesJson;
    private String eggChoicesJson;
    private boolean downloadTurbowarp;
    private String turbowarpZipUrl;
    private boolean forceDownloadOnStart;
    private Path externalTurbowarpRoot;
    private final String customAssetBase = "turbowarp-custom/";
    private Map<String, byte[]> staticOverrides = Map.of();
    private Map<String, PromptLocale> promptLocales = Map.of();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(this, this);
        applyConfigAndStart();
    }

    @Override
    public void onDisable() { stopServers(); }

    private void applyConfigAndStart() {
        stopServers();
        debug = getConfig().getBoolean("debug", false);
        logDebug("Debug mode enabled");

        magicLinkEnabled = getConfig().getBoolean("magicLink.enabled", true);
        requireSession = getConfig().getBoolean("ws.requireSession", true);
        allowLegacyPairing = false; // legacy pairing is no longer exposed
        magicTokenTtlSeconds = Math.max(30, getConfig().getInt("magicLink.tokenTtlSeconds", 300));
        defaultLang = sanitizeLang(getConfig().getString("magicLink.defaultLang"), "en");
        defaultBranch = sanitizeBranchValue(getConfig().getString("magicLink.defaultBranch"), "main");
        magicTokens.clear();
        blockChoicesJson = buildBlockChoicesJson();
        eggChoicesJson = buildEggChoicesJson();
        staticOverrides = prepareStaticOverrides();
        promptLocales = loadPromptLocales();
        downloadTurbowarp = getConfig().getBoolean("turbowarp.download.enabled", true);
        turbowarpZipUrl = firstNonBlank(
            getConfig().getString("turbowarp.download.zipUrl"),
            "https://codeload.github.com/nando256/TurboAgent/zip/refs/heads/main"
        );
        forceDownloadOnStart = getConfig().getBoolean("turbowarp.download.forceOnStart", false);
        externalTurbowarpRoot = prepareExternalTurbowarp();

        String wsAddr = firstNonBlank(
            getConfig().getString("ws.bindAddress"),
            getConfig().getString("ws.address"),
            "0.0.0.0"
        );
        wsBindAddress = wsAddr;
        wsPort = getConfig().getInt("ws.port", 8787);
        int rate = getConfig().getInt("ws.maxMsgPerSecond", 30);
        int maxBytes = getConfig().getInt("ws.maxMsgBytes", 8192);
        var origins = new java.util.HashSet<>(getConfig().getStringList("ws.originWhitelist"));
        boolean pairingRequired = getConfig().getBoolean(
            "ws.requirePairing",
            getConfig().getBoolean("pairing.enabled", true)
        );
        int pairWindowSec = getConfig().getInt("pairing.windowSeconds", 60);
        httpEnabled = getConfig().getBoolean("http.enabled", true);
        httpBindAddress = firstNonBlank(getConfig().getString("http.bindAddress"), "0.0.0.0");
        httpPort = getConfig().getInt("http.port", 8788);

        try {
            wsServer = new BridgeServer(this, wsAddr, wsPort, origins, rate, maxBytes, pairingRequired, pairWindowSec, requireSession, allowLegacyPairing);
            wsServer.setReuseAddr(true);
            wsServer.start();
            getLogger().info("WS: ws://" + wsAddr + ":" + wsPort);
        } catch (Exception e) {
            getLogger().severe("WS Server Failed: " + e.getMessage());
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        if (httpEnabled) {
            int cacheSeconds = Math.max(0, getConfig().getInt("http.cacheSeconds", 300));
            try {
                httpServer = new StaticHttpServer(this, httpBindAddress, httpPort, "turbowarp/", cacheSeconds, staticOverrides, externalTurbowarpRoot);
                httpServer.start();
                getLogger().info("HTTP: http://" + httpBindAddress + ":" + httpPort + "/ ("
                    + (externalTurbowarpRoot != null ? "fs " + externalTurbowarpRoot : "classpath")
                    + ")");
            } catch (Exception e) {
                getLogger().severe("HTTP Server Failed: " + e.getMessage());
            }
        }

    }

    private void stopServers() {
        if (httpServer != null) { httpServer.stop(); httpServer = null; }
        if (wsServer != null) { try { wsServer.stop(1000); } catch (Exception ignored) {} wsServer = null; }
        cleanupAgents();
        magicTokens.clear();
    }

    @Override
    public boolean onCommand(CommandSender s, Command c, String l, String[] a) {
        var cmdName = c.getName().toLowerCase(Locale.ROOT);
        if ("tw".equals(cmdName)) {
            return handleMagicLinkCommand(s, a);
        }
        return false;
    }

    private Map<String, PromptLocale> loadPromptLocales() {
        var map = new HashMap<String, PromptLocale>();
        map.put("en", PromptLocale.defaultEn());
        map.put("ja", PromptLocale.defaultJa());
        loadPromptLocaleFromResource("locale/prompt/en.json", map);
        loadPromptLocaleFromResource("locale/prompt/ja.json", map);
        return map;
    }

    private void loadPromptLocaleFromResource(String path, Map<String, PromptLocale> sink) {
        try (var is = getResource(path)) {
            if (is == null) return;
            var json = new JSONObject(new String(is.readAllBytes(), StandardCharsets.UTF_8));
            var loc = PromptLocale.fromJson(json);
            if (loc != null && loc.key != null && !loc.key.isBlank()) {
                sink.put(loc.key, loc);
            }
        } catch (Exception e) {
            getLogger().warning("Failed to load prompt locale " + path + ": " + e.getMessage());
        }
    }

    private boolean handleMagicLinkCommand(CommandSender sender, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Player only command");
            return true;
        }
        if (!sender.hasPermission("turboagent.link")) {
            sender.sendMessage("No permission");
            return true;
        }
        if (!magicLinkEnabled) {
            sender.sendMessage("Magic link is disabled in config");
            return true;
        }
        var firstArg = args != null && args.length > 0 ? args[0] : null;
        boolean testMode = firstArg != null && firstArg.equalsIgnoreCase("test");
        var link = buildMagicLink(player, null, testMode);
        if (link == null || link.isBlank()) {
            sender.sendMessage("Failed to create link");
            return true;
        }
        try {
            var clickable = new TextComponent("[TurboAgent] TurboWarp link: ");
            clickable.setColor(net.md_5.bungee.api.ChatColor.AQUA);
            var linkPart = new TextComponent(link);
            linkPart.setColor(net.md_5.bungee.api.ChatColor.AQUA);
            linkPart.setUnderlined(true);
            linkPart.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, link));
            linkPart.setHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, new ComponentBuilder("Click to open").create()));
            clickable.addExtra(linkPart);
            player.spigot().sendMessage(clickable);
        } catch (Exception ignored) {
            player.sendMessage(ChatColor.AQUA + "[TurboAgent] TurboWarp link: " + ChatColor.UNDERLINE + link);
        }
        return true;
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        var player = event.getPlayer();
        if (player == null) return;
        if (!magicLinkEnabled) return;
        if (!player.hasPermission("turboagent.link")) return;
        var link = buildMagicLink(player, null, false);
        if (link == null || link.isBlank()) return;
        sendMagicPrompt(player, link);
    }

    private void sendMagicPrompt(Player player, String link) {
        var lang = sanitizeLang(player == null ? null : player.getLocale(), promptLangDefault);
        var locale = resolvePromptLocale(lang);
        try {
            var prefix = new TextComponent(locale.prompt);
            prefix.setColor(net.md_5.bungee.api.ChatColor.AQUA);
            var yes = new TextComponent(locale.yes);
            yes.setColor(net.md_5.bungee.api.ChatColor.GREEN);
            yes.setBold(true);
            yes.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, link));
            yes.setHoverEvent(new HoverEvent(
                HoverEvent.Action.SHOW_TEXT,
                new ComponentBuilder(locale.hover).create()
            ));

            var no = new TextComponent(" " + locale.no);
            no.setColor(net.md_5.bungee.api.ChatColor.GRAY);

            prefix.addExtra(yes);
            prefix.addExtra(no);
            player.spigot().sendMessage(prefix);
            player.sendMessage(ChatColor.GRAY + locale.clickHint);
            player.sendMessage(ChatColor.GRAY + locale.adblockHint);
        } catch (Exception e) {
            player.sendMessage(ChatColor.AQUA + locale.prompt + " " + ChatColor.UNDERLINE + link);
            player.sendMessage(ChatColor.GRAY + locale.clickHint);
            player.sendMessage(ChatColor.GRAY + locale.adblockHint);
        }
    }

    private PromptLocale resolvePromptLocale(String lang) {
        var normalized = sanitizeLang(lang, promptLangDefault);
        var exact = promptLocales.get(normalized);
        if (exact != null) return exact;
        var base = normalized.contains("-") ? normalized.substring(0, normalized.indexOf('-')) : normalized;
        var baseLocale = promptLocales.get(base);
        if (baseLocale != null) return baseLocale;
        return promptLocales.getOrDefault(promptLangDefault, PromptLocale.defaultEn());
    }

    public void handleCommand(String command, Runnable onSuccess, Consumer<String> onFailure) {
        if (command == null || command.isBlank()) {
            if (onFailure != null) onFailure.accept("command required");
            return;
        }
        logDebug("Executing command: " + command);
        runSync(() -> {
            try {
                boolean success = getServer().dispatchCommand(getServer().getConsoleSender(), command);
                logDebug("Command result: " + success);
                if (success) {
                    if (onSuccess != null) onSuccess.run();
                } else {
                    if (onFailure != null) onFailure.accept("command failed");
                }
            } catch (Exception e) {
                getLogger().warning("Bridge command failed: " + e.getMessage());
                if (onFailure != null) onFailure.accept(e.getMessage());
            }
        });
    }

    private String buildMagicLink(Player player, String branchOverride, boolean testMode) {
        var token = issueMagicToken(player == null ? null : player.getName());
        if (token == null) return null;
        var lang = chooseMagicLang(player);
        var httpHost = resolveHttpHost(player);
        var hostForPlayer = resolveAdvertisedHost(player);
        var extensionUrl = testMode
            ? resolveTestExtensionUrl(httpHost)
            : resolveExtensionUrl(lang, httpHost);
        var wsUrl = buildWsDefaultUrl(hostForPlayer, wsPort, "ws");
        if (!httpEnabled) {
            getLogger().warning("HTTP server disabled; cannot create magic link.");
            return null;
        }
        var base = "http://" + httpHost + ":" + httpPort + "/editor.html";
        var extWithQuery = extensionUrl;
        if (testMode) {
            extWithQuery = extensionUrl + (extensionUrl.contains("?") ? "&" : "?") + "lang=" + encodeComponent(lang);
        } else {
            extWithQuery = extensionUrl
                + (extensionUrl.contains("?") ? "&" : "?")
                + "host=" + encodeComponent(wsUrl)
                + "&token=" + encodeComponent(token)
                + "&lang=" + encodeComponent(lang);
        }
        var encodedExt = encodeComponent(extWithQuery);
        if (encodedExt == null) return null;
        var builder = new StringBuilder(base);
        builder.append(base.contains("?") ? "&" : "?").append("extension=").append(encodedExt);
        return builder.toString();
    }

    private String resolveExtensionUrl(String lang, String httpHost) {
        return "http://" + httpHost + ":" + httpPort + "/turboagent.js";
    }

    private String resolveTestExtensionUrl(String httpHost) {
        return "http://" + httpHost + ":" + httpPort + "/turboagent-test.js";
    }

    private String ensureHost(String host) {
        if (host == null || host.isBlank() || isAnyAddress(host) || isLoopbackHost(host)) {
            var detected = detectLocalIp();
            if (detected != null && !detected.isBlank()) return detected;
            return "127.0.0.1";
        }
        return host;
    }

    private String resolveHttpHost(Player player) {
        if (isUsableSpecificHost(httpBindAddress)) return ensureHost(httpBindAddress);
        // When bind address is 0.0.0.0 or blank, pick a host based on client route / advertiseAddress,
        // but do NOT let ws.bindAddress override HTTP host.
        return ensureHost(resolveHttpAdvertisedHost(player));
    }

    private String issueMagicToken(String playerName) {
        if (playerName == null || playerName.isBlank()) return null;
        purgeExpiredTokens();
        byte[] buf = new byte[24];
        tokenRng.nextBytes(buf);
        var token = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
        long expires = System.currentTimeMillis() + (long) magicTokenTtlSeconds * 1000L;
        magicTokens.put(token, new MagicToken(playerName, expires));
        return token;
    }

    public String consumeMagicToken(String token) {
        if (token == null || token.isBlank()) return null;
        purgeExpiredTokens();
        var entry = magicTokens.remove(token);
        if (entry == null) return null;
        if (entry.expiresAt() < System.currentTimeMillis()) return null;
        return entry.player();
    }

    private void purgeExpiredTokens() {
        long now = System.currentTimeMillis();
        magicTokens.entrySet().removeIf(e -> e.getValue() == null || e.getValue().expiresAt() < now);
    }

    private String chooseMagicLang(Player player) {
        var requested = sanitizeLang(player == null ? null : player.getLocale(), defaultLang);
        if (hasLocaleForLang(requested)) return requested;
        var base = requested.contains("-") ? requested.substring(0, requested.indexOf('-')) : requested;
        if (hasLocaleForLang(base)) return base;
        if (hasLocaleForLang(defaultLang)) return defaultLang;
        return "en";
    }

    private String resolveAdvertisedHost(Player player) {
        // Explicit bindAddress wins unless it is a wildcard/loopback.
        if (isUsableSpecificHost(wsBindAddress)) return wsBindAddress.trim();

        // Prefer the exact local interface used to reach the player's remote address,
        // then fall back to a subnet match (e.g., same /24).
        if (player != null && player.getAddress() != null && player.getAddress().getAddress() != null) {
            var localFromChannel = localAddressFromPlayer(player);
            if (localFromChannel != null && !localFromChannel.isBlank()) return localFromChannel;
            var remoteHost = player.getAddress().getAddress().getHostAddress();
            var routed = localAddressForRemote(remoteHost);
            if (routed != null && !routed.isBlank()) return routed;
            var matched = findLocalForRemote(remoteHost);
            if (matched != null && !matched.isBlank()) return matched;
        }

        var serverIp = getServer() == null ? null : getServer().getIp();
        if (serverIp != null && !serverIp.isBlank() && !isAnyAddress(serverIp) && !isLoopbackHost(serverIp)) {
            return serverIp.trim();
        }

        var detected = detectLocalIp();
        if (detected != null && !detected.isBlank() && !isLoopbackHost(detected) && !isAnyAddress(detected)) return detected;

        return "127.0.0.1";
    }

    /**
     * Advertised host for HTTP links.
     * - Prefer the interface used for the player connection or a subnet match.
     * - Never prefer ws.bindAddress here, so that HTTP can still follow the client's route when ws.bindAddress is fixed.
     */
    private String resolveHttpAdvertisedHost(Player player) {
        if (player != null && player.getAddress() != null && player.getAddress().getAddress() != null) {
            var localFromChannel = localAddressFromPlayer(player);
            if (localFromChannel != null && !localFromChannel.isBlank()) return localFromChannel;
            var remoteHost = player.getAddress().getAddress().getHostAddress();
            var routed = localAddressForRemote(remoteHost);
            if (routed != null && !routed.isBlank()) return routed;
            var matched = findLocalForRemote(remoteHost);
            if (matched != null && !matched.isBlank()) return matched;
        }

        var serverIp = getServer() == null ? null : getServer().getIp();
        if (serverIp != null && !serverIp.isBlank() && !isAnyAddress(serverIp) && !isLoopbackHost(serverIp)) {
            return serverIp.trim();
        }

        var detected = detectLocalIp();
        if (detected != null && !detected.isBlank() && !isLoopbackHost(detected) && !isAnyAddress(detected)) return detected;

        return "127.0.0.1";
    }

    private String findLocalForRemote(String remoteHost) {
        if (remoteHost == null || remoteHost.isBlank()) return null;
        try {
            var remote = java.net.InetAddress.getByName(remoteHost.trim());
            if (!(remote instanceof java.net.Inet4Address remote4)) return null;
            int remoteInt = java.nio.ByteBuffer.wrap(remote4.getAddress()).getInt();
            int mask = 0xFFFFFF00; // /24 subnet match
            java.util.Enumeration<java.net.NetworkInterface> ifaces = java.net.NetworkInterface.getNetworkInterfaces();
            while (ifaces != null && ifaces.hasMoreElements()) {
                var iface = ifaces.nextElement();
                if (iface == null || !iface.isUp() || iface.isLoopback()) continue;
                var addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    var addr = addrs.nextElement();
                    if (!(addr instanceof java.net.Inet4Address local4)) continue;
                    if (local4.isLoopbackAddress() || local4.isAnyLocalAddress()) continue;
                    if (local4.isLinkLocalAddress()) continue;
                    int localInt = java.nio.ByteBuffer.wrap(local4.getAddress()).getInt();
                    if ((localInt & mask) == (remoteInt & mask)) {
                        return local4.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private boolean hasLocaleForLang(String lang) {
        if (lang == null || lang.isBlank()) return false;
        var path = "turbowarp/locale/" + lang + ".json";
        try (var ignored = getResource(path)) {
            return ignored != null;
        } catch (Exception e) {
            return false;
        }
    }

    private static String sanitizeBranchValue(String raw, String fallback) {
        var fb = (fallback == null || fallback.isBlank()) ? "main" : fallback.trim();
        if (raw == null) return fb;
        var normalized = raw.trim();
        if (normalized.isBlank() || normalized.length() > 48) return fb;
        if (!normalized.matches("[A-Za-z0-9._-]{1,48}")) return fb;
        return normalized;
    }

    public String getBlockChoicesJson() {
        if (blockChoicesJson != null && !blockChoicesJson.isBlank()) return blockChoicesJson;
        return "[[\"stone\",\"stone\"],[\"dirt\",\"dirt\"],[\"cobblestone\",\"cobblestone\"]]";
    }

    public String getEggChoicesJson() {
        if (eggChoicesJson != null && !eggChoicesJson.isBlank()) return eggChoicesJson;
        return "[[\"Cow Spawn Egg\",\"cow_spawn_egg\"],[\"Pig Spawn Egg\",\"pig_spawn_egg\"]]";
    }

    private String buildBlockChoicesJson() {
        var sb = new StringBuilder();
        sb.append("[");
        boolean first = true;
        for (var material : Material.values()) {
            if (!material.isBlock()) continue;
            if (!material.isItem()) continue;
            if (material.isAir()) continue;
            var id = material.getKey().getKey();
            var name = humanizeMaterialName(id);
            if (!first) sb.append(",");
            sb.append("[\"").append(escapeJson(name)).append("\",\"").append(escapeJson(id)).append("\"]");
            first = false;
        }
        if (first) {
            sb.append("[\"stone\",\"stone\"],[\"dirt\",\"dirt\"],[\"cobblestone\",\"cobblestone\"]");
        }
        sb.append("]");
        return sb.toString();
    }

    private String buildEggChoicesJson() {
        var sb = new StringBuilder();
        sb.append("[");
        boolean first = true;
        for (var material : Material.values()) {
            if (!material.isItem()) continue;
            var key = material.getKey().getKey();
            if (!key.endsWith("_spawn_egg")) continue;
            var name = humanizeMaterialName(key);
            if (!first) sb.append(",");
            sb.append("[\"").append(escapeJson(name)).append("\",\"").append(escapeJson(key)).append("\"]");
            first = false;
        }
        if (first) {
            sb.append("[\"Cow Spawn Egg\",\"cow_spawn_egg\"],[\"Pig Spawn Egg\",\"pig_spawn_egg\"]");
        }
        sb.append("]");
        return sb.toString();
    }

    private Map<String, byte[]> prepareStaticOverrides() {
        var map = new HashMap<String, byte[]>();
        prepareWithBlocks("turbowarp-custom/turboagent.js", map);
        prepareWithBlocks("turbowarp-custom/turboagent-test.js", map);
        return map;
    }

    private void prepareWithBlocks(String resourcePath, Map<String, byte[]> sink) {
        try (var is = getResource(resourcePath)) {
            if (is == null) return;
            var body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            if (body.contains("__BLOCK_LIST__")) {
                body = body.replace("__BLOCK_LIST__", blockChoicesJson);
            }
            if (body.contains("__EGG_LIST__")) {
                body = body.replace("__EGG_LIST__", eggChoicesJson);
            }
            sink.put(resourcePath.replace("turbowarp/", ""), body.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            getLogger().warning("Failed to prepare static resource " + resourcePath + ": " + e.getMessage());
        }
    }

    private static String humanizeMaterialName(String key) {
        if (key == null || key.isBlank()) return "";
        var parts = key.split("_");
        var builder = new StringBuilder();
        for (var part : parts) {
            if (part.isBlank()) continue;
            if (builder.length() > 0) builder.append(' ');
            builder.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) builder.append(part.substring(1));
        }
        return builder.toString();
    }

    private static String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void playPlacementSound(Material material, Location loc) {
        if (material == null || loc == null || loc.getWorld() == null) return;
        try {
            var data = material.createBlockData();
            if (data != null && data.getSoundGroup() != null) {
                var sg = data.getSoundGroup();
                var sound = sg.getPlaceSound();
                if (sound != null) {
                    loc.getWorld().playSound(loc, sound, sg.getVolume(), sg.getPitch());
                    return;
                }
            }
        } catch (Exception ignored) {}
        // Fallback generic sound
        loc.getWorld().playSound(loc, Sound.BLOCK_STONE_PLACE, 1.0f, 1.0f);
    }

    private boolean isSpawnEgg(ItemStack item) {
        if (item == null) return false;
        var type = item.getType();
        if (type != null && type.name().toLowerCase(Locale.ROOT).endsWith("_spawn_egg")) return true;
        var meta = item.getItemMeta();
        return meta instanceof SpawnEggMeta;
    }

    private org.bukkit.entity.Entity spawnFromEgg(ItemStack egg, Location loc) {
        try {
            EntityType type = null;
            var meta = egg.getItemMeta();
            if (meta instanceof SpawnEggMeta sem) {
                try {
                    // Paper >=1.20: getCustomSpawnedType (nullable)
                    var method = sem.getClass().getMethod("getCustomSpawnedType");
                    var res = method.invoke(sem);
                    if (res instanceof EntityType t) type = t;
                } catch (Exception ignored) {
                    // Fallback to legacy API via reflection to avoid compile-time deprecation
                    try {
                        var m = sem.getClass().getMethod("getSpawnedType");
                        var res = m.invoke(sem);
                        if (res instanceof EntityType t) type = t;
                    } catch (Exception ignored2) {}
                }
            }
            if (type == null) {
                var mat = egg.getType();
                if (mat != null) {
                    var key = mat.getKey().getKey();
                    if (key.endsWith("_spawn_egg")) {
                        var base = key.substring(0, key.length() - "_spawn_egg".length()).toUpperCase(Locale.ROOT);
                        try {
                            type = EntityType.valueOf(base);
                        } catch (Exception ignored) {}
                    }
                }
            }
            if (type == null) return null;
            var world = loc.getWorld();
            if (world == null) return null;
            return world.spawnEntity(loc, type);
        } catch (Exception e) {
            getLogger().warning("Spawn from egg failed: " + e.getMessage());
            return null;
        }
    }

    private static String encodeComponent(String value) {
        if (value == null) return null;
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
        } catch (Exception e) {
            return "";
        }
    }

    public void handleAgentTeleportToPlayer(String agentId,
                                            String ownerName,
                                            Runnable onSuccess,
                                            Consumer<String> onFailure) {
        runSync(() -> {
            var player = resolvePlayer(ownerName);
            if (player == null) {
                logDebug("Teleport failed: player '" + ownerName + "' not found");
                if (onFailure != null) onFailure.accept("player not found");
                return;
            }
            var ownerKey = player.getName();
            var agentKey = agentMapKey(ownerKey, agentId);
            logDebug("Teleport agent " + agentId + " for " + ownerKey);
            var existing = agents.get(agentKey);
            ArmorStand stand = existing == null ? null : getAgentEntity(existing.entityId());
            var inventory = agentInventories.computeIfAbsent(agentKey, k -> new AgentInventory());
            Location target = normalizeLocation(player.getLocation());
            if (stand == null) {
                logDebug("Spawning new agent " + agentId);
                stand = spawnAgent(ownerKey, agentId, target);
                if (stand == null) {
                    logDebug("Spawning agent failed (spawnAgent returned null)");
                    if (onFailure != null) onFailure.accept("spawn failed");
                    return;
                }
                agents.put(agentKey, new AgentEntry(stand.getUniqueId(), ownerKey));
            } else {
                logDebug("Teleporting existing agent " + agentId);
                stand.teleport(target);
            }
            resetFacingForward(stand);
            applyActiveSlotToStand(stand, inventory);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentMove(String agentId,
                                String ownerName,
                                String direction,
                                double blocks,
                                Runnable onSuccess,
                                Consumer<String> onFailure) {
        runSync(() -> {
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            if (!entry.owner().equalsIgnoreCase(ownerName)) {
                if (onFailure != null) onFailure.accept("agent owned by another player");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var normalizedDirection = normalizeDirection(direction);
            if (normalizedDirection == null) {
                if (onFailure != null) onFailure.accept("invalid direction");
                return;
            }
            double distance = Math.max(0, Math.min(Math.abs(blocks), 64.0));
            if (distance < 0.01) {
                if (onFailure != null) onFailure.accept("blocks must be greater than 0");
                return;
            }
            var vector = resolveDirectionVector(stand.getLocation(), normalizedDirection);
            if (vector == null) {
                if (onFailure != null) onFailure.accept("unable to resolve direction");
                return;
            }
            var origin = stand.getLocation();
            var offset = vector.multiply(distance);
            var target = normalizeAgentTarget(origin.clone().add(offset), origin);
            if (target == null) {
                if (onFailure != null) onFailure.accept("invalid target");
                return;
            }
            animateAgentMove(stand);
            stand.teleport(target);
            resetFacingForward(stand);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentRotate(String agentId,
                                  String ownerName,
                                  String direction,
                                  Runnable onSuccess,
                                  Consumer<String> onFailure) {
        runSync(() -> {
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            if (!entry.owner().equalsIgnoreCase(ownerName)) {
                if (onFailure != null) onFailure.accept("agent owned by another player");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var turnDir = normalizeTurnDirection(direction);
            if (turnDir == null) {
                if (onFailure != null) onFailure.accept("invalid direction");
                return;
            }
            float delta = "left".equals(turnDir) ? -90f : 90f;
            var loc = stand.getLocation();
            float newYaw = normalizeYaw(loc.getYaw() + delta);
            stand.teleport(new Location(loc.getWorld(), loc.getX(), loc.getY(), loc.getZ(), newYaw, loc.getPitch()));
            resetFacingForward(stand);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentFacePlayer(String agentId,
                                      String ownerName,
                                      String targetPlayerName,
                                      Runnable onSuccess,
                                      Consumer<String> onFailure) {
        runSync(() -> {
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            if (!entry.owner().equalsIgnoreCase(ownerName)) {
                if (onFailure != null) onFailure.accept("agent owned by another player");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var targetName = targetPlayerName == null ? "" : targetPlayerName.trim();
            if (targetName.isEmpty()) {
                if (onFailure != null) onFailure.accept("target player required");
                return;
            }
            var targetPlayer = resolvePlayer(targetName);
            if (targetPlayer == null) {
                if (onFailure != null) onFailure.accept("target player not found");
                return;
            }
            var standLoc = stand.getLocation();
            var targetLoc = targetPlayer.getLocation();
            var standWorld = standLoc.getWorld();
            var targetWorld = targetLoc.getWorld();
            if (standWorld == null || targetWorld == null || !standWorld.equals(targetWorld)) {
                if (onFailure != null) onFailure.accept("player not in same world");
                return;
            }
            var standEyeY = standLoc.getY() + stand.getEyeHeight();
            var targetEyeY = targetLoc.getY() + targetPlayer.getEyeHeight();
            double dx = targetLoc.getX() - standLoc.getX();
            double dz = targetLoc.getZ() - standLoc.getZ();
            double dy = targetEyeY - standEyeY;
            double horiz = Math.sqrt(dx * dx + dz * dz);
            float yaw = horiz < 1.0E-4
                ? standLoc.getYaw()
                : normalizeYaw((float) Math.toDegrees(Math.atan2(-dx, dz)));
            float pitch;
            if (horiz < 1.0E-4) {
                if (Math.abs(dy) < 1.0E-4) {
                    pitch = standLoc.getPitch();
                } else {
                    pitch = dy > 0 ? -90f : 90f;
                }
            } else {
                pitch = (float) Math.toDegrees(-Math.atan2(dy, horiz));
            }
            if (pitch < -90f) pitch = -90f;
            if (pitch > 90f) pitch = 90f;
            stand.teleport(new Location(standWorld, standLoc.getX(), standLoc.getY(), standLoc.getZ(), yaw, pitch));
            var slightTilt = new EulerAngle(Math.toRadians(-10), 0, 0);
            stand.setHeadPose(slightTilt);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentDespawn(String agentId,
                                   String ownerName,
                                   Runnable onSuccess,
                                   Consumer<String> onFailure) {
        runSync(() -> {
            var agentKey = agentMapKey(ownerName, agentId);
            var existing = agents.get(agentKey);
            if (existing == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            if (!existing.owner().equalsIgnoreCase(ownerName)) {
                if (onFailure != null) onFailure.accept("agent owned by another player");
                return;
            }
            var entity = getAgentEntity(existing.entityId());
            if (entity != null) entity.remove();
            agents.remove(agentKey);
            agentInventories.remove(agentKey);
            logDebug("Despawned agent " + agentId);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentSlotAssignBlock(String agentId,
                                           String ownerName,
                                           String blockId,
                                           int amount,
                                           int slot,
                                           Runnable onSuccess,
                                           Consumer<String> onFailure) {
        runSync(() -> {
            if (slot < 1 || slot > 27) {
                if (onFailure != null) onFailure.accept("slot must be 1-27");
                return;
            }
            if (amount < 1 || amount > 64) {
                if (onFailure != null) onFailure.accept("amount must be 1-64");
                return;
            }
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                agentInventories.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            if (blockId == null || blockId.isBlank()) {
                if (onFailure != null) onFailure.accept("block required");
                return;
            }
            var material = Material.matchMaterial(blockId);
            if (material == null || !material.isItem()) {
                if (onFailure != null) onFailure.accept("invalid block");
                return;
            }
            var inventory = agentInventories.computeIfAbsent(agentKey, k -> new AgentInventory());
            inventory.slots[slot - 1] = new ItemStack(material, amount);
            if (inventory.activeSlot == slot - 1) {
                applyActiveSlotToStand(stand, inventory);
            }
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentSlotActivate(String agentId,
                                        String ownerName,
                                        int slot,
                                        Runnable onSuccess,
                                        Consumer<String> onFailure) {
        runSync(() -> {
            if (slot < 1 || slot > 27) {
                if (onFailure != null) onFailure.accept("slot must be 1-27");
                return;
            }
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                agentInventories.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var inventory = agentInventories.computeIfAbsent(agentKey, k -> new AgentInventory());
            inventory.activeSlot = slot - 1;
            applyActiveSlotToStand(stand, inventory);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public void handleAgentPlace(String agentId,
                                 String ownerName,
                                 String direction,
                                 Runnable onSuccess,
                                 Consumer<String> onFailure) {
        runSync(() -> {
            var agentKey = agentMapKey(ownerName, agentId);
            var entry = agents.get(agentKey);
            if (entry == null) {
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var stand = getAgentEntity(entry.entityId());
            if (stand == null) {
                agents.remove(agentKey);
                agentInventories.remove(agentKey);
                if (onFailure != null) onFailure.accept("agent not found");
                return;
            }
            var inventory = agentInventories.get(agentKey);
            if (inventory == null || inventory.activeSlot < 0 || inventory.activeSlot >= inventory.slots.length) {
                if (onFailure != null) onFailure.accept("no active slot");
                return;
            }
            var held = inventory.slots[inventory.activeSlot];
            if (held == null || held.getType() == null) {
                if (onFailure != null) onFailure.accept("active slot empty");
                return;
            }
            var targetOffset = resolvePlaceOffset(stand.getLocation(), direction);
            if (targetOffset == null) {
                if (onFailure != null) onFailure.accept("invalid direction");
                return;
            }
            var targetLoc = stand.getLocation().clone().add(targetOffset);
            var targetBlock = targetLoc.getBlock();
            if (targetBlock == null) {
                if (onFailure != null) onFailure.accept("invalid target");
                return;
            }
            if (isSpawnEgg(held)) {
                // Allow spawning in air/liquids; only block if target is a solid block.
                if (!targetBlock.isEmpty() && targetBlock.getType().isSolid() && !targetBlock.isPassable()) {
                    if (onFailure != null) onFailure.accept("target not empty");
                    return;
                }
                var spawned = spawnFromEgg(held, targetBlock.getLocation().add(0.5, 0, 0.5));
                if (spawned == null) {
                    if (onFailure != null) onFailure.accept("spawn failed");
                    return;
                }
            } else {
                if (!held.getType().isBlock()) {
                    if (onFailure != null) onFailure.accept("active slot has no block");
                    return;
                }
                if (!targetBlock.isEmpty() && !targetBlock.getType().isAir()) {
                    if (onFailure != null) onFailure.accept("target not empty");
                    return;
                }
                targetBlock.setType(held.getType(), false);
                playPlacementSound(held.getType(), targetBlock.getLocation().add(0.5, 0.5, 0.5));
            }
            var newAmount = held.getAmount() - 1;
            inventory.slots[inventory.activeSlot] = newAmount > 0 ? new ItemStack(held.getType(), newAmount) : null;
            applyActiveSlotToStand(stand, inventory);
            if (onSuccess != null) onSuccess.run();
        });
    }

    public String resolveOnlinePlayerName(String name) {
        if (name == null || name.isBlank()) return null;
        var resolved = new AtomicReference<String>(null);
        var latch = new CountDownLatch(1);
        runSync(() -> {
            try {
                var player = resolvePlayer(name);
                if (player != null) {
                    resolved.set(player.getName());
                }
            } finally {
                latch.countDown();
            }
        });
        try {
            latch.await(1, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return resolved.get();
    }

    private void cleanupAgents() {
        if (agents.isEmpty()) return;
        runSync(() -> {
            agents.values().forEach(entry -> {
                var entity = Bukkit.getEntity(entry.entityId());
                if (entity != null) entity.remove();
            });
            agents.clear();
            agentInventories.clear();
        });
    }

    private Player resolvePlayer(String name) {
        if (name == null || name.isBlank()) return null;
        var exact = getServer().getPlayerExact(name);
        if (exact != null) return exact;
        return getServer().getPlayer(name);
    }

    private ArmorStand spawnAgent(String ownerKey, String agentId, Location loc) {
        World world = loc.getWorld();
        if (world == null) return null;
        Location target = normalizeLocation(loc);
        return world.spawn(target, ArmorStand.class, spawned -> {
            spawned.setCustomName(ChatColor.GRAY + ownerKey + "." + agentId + ChatColor.RESET);
            spawned.setCustomNameVisible(true);
            spawned.setInvisible(false);
            spawned.setMarker(false);
            spawned.setGravity(false);
            spawned.setArms(true);
            spawned.setBasePlate(false);
            spawned.setSmall(true);
            spawned.setGlowing(true);
            spawned.setInvulnerable(true);
            spawned.setRemoveWhenFarAway(false);
            spawned.setCollidable(false);
            var equipment = spawned.getEquipment();
            if (equipment != null) {
                equipment.clear();
                equipment.setHelmet(createGolemHead());
                equipment.setChestplate(new ItemStack(Material.IRON_CHESTPLATE));
                equipment.setLeggings(new ItemStack(Material.LEATHER_LEGGINGS));
                equipment.setBoots(new ItemStack(Material.LEATHER_BOOTS));
            }
        });
    }

    private ItemStack createLeatherArmor(Material type) {
        var item = new ItemStack(type);
        var meta = (LeatherArmorMeta) item.getItemMeta();
        if (meta != null) {
            meta.setColor(Color.fromRGB(200, 200, 200));
            item.setItemMeta(meta);
        }
        return item;
    }

    private ItemStack createGolemHead() {
        var item = new ItemStack(Material.PLAYER_HEAD);
        var meta = (SkullMeta) item.getItemMeta();
        if (meta != null) {
            OfflinePlayer owner = Bukkit.getOfflinePlayer("MHF_Golem");
            meta.setOwningPlayer(owner);
            item.setItemMeta(meta);
        }
        return item;
    }

    private ArmorStand getAgentEntity(UUID uuid) {
        if (uuid == null) return null;
        var entity = Bukkit.getEntity(uuid);
        if (entity instanceof ArmorStand stand && !stand.isDead()) {
            return stand;
        }
        agents.values().removeIf(entry -> entry.entityId().equals(uuid));
        return null;
    }

    private Path prepareExternalTurbowarp() {
        if (!downloadTurbowarp) return null;
        try {
            var targetDir = new File(getDataFolder(), "turbowarp").toPath();
            if (forceDownloadOnStart && Files.exists(targetDir)) {
                deleteRecursive(targetDir);
            }
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
                if (!downloadAndExtractTurbowarp(targetDir)) {
                    getLogger().warning("Failed to download TurboWarp assets; falling back to classpath resources.");
                    return null;
                }
            }
            overlayCustomAssets(targetDir);
            patchDownloadedAssets(targetDir);
            return targetDir;
        } catch (Exception e) {
            getLogger().warning("Preparing TurboWarp assets failed: " + e.getMessage());
            return null;
        }
    }

    private boolean downloadAndExtractTurbowarp(Path targetDir) {
        getLogger().info("Downloading TurboWarp assets from " + turbowarpZipUrl);
        var tmpZip = targetDir.resolveSibling("turbowarp.zip");
        try (var in = new java.net.URL(turbowarpZipUrl).openStream()) {
            Files.copy(in, tmpZip, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            getLogger().warning("Download failed: " + e.getMessage());
            return false;
        }
        try (var zipIn = new java.util.zip.ZipInputStream(Files.newInputStream(tmpZip))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zipIn.getNextEntry()) != null) {
                var name = entry.getName();
                // Expect entries like TurboAgent-main/turbowarp/...
                var idx = name.indexOf("turbowarp/");
                if (idx < 0) continue;
                var relative = name.substring(idx + "turbowarp/".length());
                if (relative.isEmpty()) continue;
                var outPath = targetDir.resolve(relative).normalize();
                if (!outPath.startsWith(targetDir)) continue;
                if (entry.isDirectory()) {
                    Files.createDirectories(outPath);
                } else {
                    Files.createDirectories(outPath.getParent());
                    Files.copy(zipIn, outPath, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        } catch (Exception e) {
            getLogger().warning("Extract failed: " + e.getMessage());
            return false;
        } finally {
            try { Files.deleteIfExists(tmpZip); } catch (Exception ignored) {}
        }
        return true;
    }

    private void patchDownloadedAssets(Path root) {
        patchFile(root.resolve("turboagent.js"));
        patchFile(root.resolve("turboagent-test.js"));
    }

    private void overlayCustomAssets(Path root) {
        copyResourceTo(root.resolve("turboagent.js"), customAssetBase + "turboagent.js");
        copyResourceTo(root.resolve("turboagent-test.js"), customAssetBase + "turboagent-test.js");
        copyResourceTo(root.resolve("locale/en.json"), customAssetBase + "locale/en.json");
        copyResourceTo(root.resolve("locale/ja.json"), customAssetBase + "locale/ja.json");
    }

    private void patchFile(Path file) {
        if (file == null || !Files.exists(file)) return;
        try {
            var body = Files.readString(file, StandardCharsets.UTF_8);
            boolean changed = false;
            if (body.contains("__BLOCK_LIST__")) {
                body = body.replace("__BLOCK_LIST__", blockChoicesJson);
                changed = true;
            }
            if (body.contains("__EGG_LIST__")) {
                body = body.replace("__EGG_LIST__", eggChoicesJson);
                changed = true;
            }
            if (changed) {
                Files.writeString(file, body, StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            getLogger().warning("Patch failed for " + file + ": " + e.getMessage());
        }
    }

    private void copyResourceTo(Path dest, String resourcePath) {
        if (dest == null || resourcePath == null) return;
        try (var is = getResource(resourcePath)) {
            if (is == null) return;
            Files.createDirectories(dest.getParent());
            Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            getLogger().warning("Failed to copy custom asset " + resourcePath + ": " + e.getMessage());
        }
    }

    private void deleteRecursive(Path path) {
        if (path == null || !Files.exists(path)) return;
        try (var stream = Files.walk(path)) {
            stream.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }

    private Location normalizeLocation(Location loc) {
        if (loc == null || loc.getWorld() == null) return loc;
        double x = Math.floor(loc.getX()) + 0.5;
        double z = Math.floor(loc.getZ()) + 0.5;
        double y = Math.floor(loc.getY()) + 0.0;
        return new Location(loc.getWorld(), x, y, z);
    }

    private void runSync(Runnable runnable) {
        if (Bukkit.isPrimaryThread()) {
            runnable.run();
        } else {
            Bukkit.getScheduler().runTask(this, runnable);
        }
    }

    public boolean isDebugEnabled() {
        return debug;
    }

    public void logDebug(String message) {
        if (debug) {
            getLogger().info("[debug] " + message);
        }
    }

    private boolean isTrackedEntity(UUID uuid) {
        if (uuid == null) return false;
        return agents.values().stream().anyMatch(entry -> entry.entityId().equals(uuid));
    }

    @EventHandler
    public void onPlayerInteract(PlayerInteractAtEntityEvent event) {
        if (isTrackedEntity(event.getRightClicked().getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @EventHandler
    public void onEntityDamage(EntityDamageByEntityEvent event) {
        if (isTrackedEntity(event.getEntity().getUniqueId())) {
            event.setCancelled(true);
        }
    }

    private void animateAgentMove(ArmorStand stand) {
        var armForward = new EulerAngle(Math.toRadians(-35), 0, Math.toRadians(5));
        var armBackward = new EulerAngle(Math.toRadians(35), 0, Math.toRadians(-5));
        var legForward = new EulerAngle(Math.toRadians(20), 0, 0);
        var legBackward = new EulerAngle(Math.toRadians(-20), 0, 0);
        new BukkitRunnable() {
            private int ticks = 0;
            private boolean flip = false;

            @Override
            public void run() {
                if (!stand.isValid() || stand.isDead()) {
                    cancel();
                    return;
                }
                flip = !flip;
                applyPose(flip);
                ticks++;
                if (ticks >= 6) {
                    resetPose();
                    cancel();
                }
            }

            private void applyPose(boolean variant) {
                if (variant) {
                    stand.setLeftArmPose(armForward);
                    stand.setRightArmPose(armBackward);
                    stand.setLeftLegPose(legBackward);
                    stand.setRightLegPose(legForward);
                } else {
                    stand.setLeftArmPose(armBackward);
                    stand.setRightArmPose(armForward);
                    stand.setLeftLegPose(legForward);
                    stand.setRightLegPose(legBackward);
                }
            }

            private void resetPose() {
                var zero = new EulerAngle(0, 0, 0);
                stand.setLeftArmPose(zero);
                stand.setRightArmPose(zero);
                stand.setLeftLegPose(zero);
                stand.setRightLegPose(zero);
            }
        }.runTaskTimer(this, 0L, 2L);
    }

    private void resetFacingForward(ArmorStand stand) {
        if (stand == null) return;
        var loc = stand.getLocation();
        if (loc == null || loc.getWorld() == null) return;
        stand.teleport(new Location(loc.getWorld(), loc.getX(), loc.getY(), loc.getZ(), loc.getYaw(), 0f));
        stand.setHeadPose(new EulerAngle(0, 0, 0));
    }

    private Location normalizeAgentTarget(Location raw, Location reference) {
        if (raw == null || raw.getWorld() == null) return raw;
        double x = Math.floor(raw.getX()) + 0.5;
        double z = Math.floor(raw.getZ()) + 0.5;
        double y = Math.floor(raw.getY());
        Location normalized = new Location(raw.getWorld(), x, y, z);
        if (reference != null) {
            normalized.setYaw(reference.getYaw());
            normalized.setPitch(reference.getPitch());
        }
        return normalized;
    }

    private Vector resolveDirectionVector(Location origin, String direction) {
        if (origin == null) return null;
        if (direction == null) return null;
        var dirTrim = direction.trim().toLowerCase(Locale.ROOT);
        if (dirTrim.equals("up")) return new Vector(0, 1, 0);
        if (dirTrim.equals("down")) return new Vector(0, -1, 0);
        var forward = origin.getDirection();
        if (forward == null || forward.lengthSquared() < 1.0E-4) {
            forward = new Vector(0, 0, 1);
        }
        forward.setY(0);
        if (forward.lengthSquared() < 1.0E-4) {
            forward = new Vector(0, 0, 1);
        } else {
            forward.normalize();
        }
        var right = forward.clone().crossProduct(new Vector(0, 1, 0));
        if (right.lengthSquared() < 1.0E-4) {
            right = new Vector(1, 0, 0);
        } else {
            right.normalize();
        }
        return switch (dirTrim) {
            case "forward" -> forward;
            case "back" -> forward.clone().multiply(-1);
            case "right" -> right;
            case "left" -> right.clone().multiply(-1);
            default -> null;
        };
    }

    private Vector resolvePlaceOffset(Location origin, String direction) {
        if (direction == null) return null;
        var dir = direction.trim().toLowerCase(Locale.ROOT);
        if (dir.equals("up")) return new Vector(0, 1, 0);
        if (dir.equals("down")) return new Vector(0, -1, 0);
        var horiz = resolveDirectionVector(origin, dir);
        if (horiz == null) return null;
        return horiz.normalize();
    }

    private String normalizeDirection(String direction) {
        if (direction == null) return null;
        return switch (direction.trim().toLowerCase(Locale.ROOT)) {
            case "forward", "back", "right", "left", "up", "down" -> direction.trim().toLowerCase(Locale.ROOT);
            default -> null;
        };
    }

    private String normalizeTurnDirection(String direction) {
        if (direction == null) return null;
        return switch (direction.trim().toLowerCase(Locale.ROOT)) {
            case "left", "right" -> direction.trim().toLowerCase(Locale.ROOT);
            default -> null;
        };
    }

    private float normalizeYaw(float yaw) {
        float normalized = yaw % 360f;
        if (normalized < -180f) normalized += 360f;
        if (normalized >= 180f) normalized -= 360f;
        return normalized;
    }

    private void applyActiveSlotToStand(ArmorStand stand, AgentInventory inventory) {
        if (stand == null || inventory == null) return;
        var equipment = stand.getEquipment();
        if (equipment == null) return;
        ItemStack item = null;
        if (inventory.activeSlot >= 0 && inventory.activeSlot < inventory.slots.length) {
            var stored = inventory.slots[inventory.activeSlot];
            if (stored != null) item = stored.clone();
        }
        equipment.setItemInMainHand(item);
    }

    private static String agentMapKey(String ownerName, String agentId) {
        var ownerPart = ownerName == null ? "" : ownerName.trim().toLowerCase(Locale.ROOT);
        var agentPart = agentId == null ? "" : agentId.trim();
        return ownerPart + "." + agentPart;
    }

    private String localAddressFromPlayer(Player player) {
        if (player == null) return null;
        try {
            var handle = player.getClass().getMethod("getHandle").invoke(player);
            if (handle == null) return null;
            var connection = readField(handle, "playerConnection", "connection");
            if (connection == null) return null;
            var networkManager = readField(connection, "networkManager", "connection");
            if (networkManager == null) return null;
            // networkManager.channel.localAddress()
            var channel = readField(networkManager, "channel");
            if (channel == null) return null;
            var localAddrObj = channel.getClass().getMethod("localAddress").invoke(channel);
            if (localAddrObj instanceof SocketAddress sa && sa instanceof InetSocketAddress inet) {
                var addr = inet.getAddress();
                if (addr != null && !addr.isAnyLocalAddress() && !addr.isLoopbackAddress()) {
                    var host = addr.getHostAddress();
                    if (!isAnyAddress(host) && !isLoopbackHost(host)) return host;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private Object readField(Object target, String... names) {
        if (target == null || names == null) return null;
        for (var name : names) {
            if (name == null || name.isBlank()) continue;
            try {
                var field = target.getClass().getField(name);
                field.setAccessible(true);
                return field.get(target);
            } catch (Exception ignored) {
                try {
                    var field = target.getClass().getDeclaredField(name);
                    field.setAccessible(true);
                    return field.get(target);
                } catch (Exception ignored2) {
                    // try next
                }
            }
        }
        return null;
    }

    private static String firstNonBlank(String... candidates) {
        for (var c : candidates) {
            if (c != null && !c.isBlank()) return c;
        }
        return null;
    }

    private String localAddressForRemote(String remoteHost) {
        if (remoteHost == null || remoteHost.isBlank()) return null;
        try {
            var remote = new java.net.InetSocketAddress(remoteHost.trim(), 80);
            try (var socket = new java.net.Socket()) {
                socket.connect(remote, 500);
                var local = socket.getLocalAddress();
                if (local != null && !local.isAnyLocalAddress() && !local.isLoopbackAddress()) {
                    var host = local.getHostAddress();
                    if (!isAnyAddress(host) && !isLoopbackHost(host)) return host;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static String sanitizeLang(String raw, String fallback) {
        var fb = (fallback == null || fallback.isBlank()) ? "en" : fallback.trim().toLowerCase(Locale.ROOT);
        if (raw == null) return fb;
        var normalized = raw.trim().replace('_', '-').toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || normalized.length() > 32) return fb;
        if (!normalized.matches("^[a-z0-9]{2,8}(?:-[a-z0-9]{1,8})*$")) return fb;
        return normalized;
    }

    private static String chooseClientHost(String... candidates) {
        for (var candidate : candidates) {
            if (candidate == null || candidate.isBlank()) continue;
            var normalized = candidate.trim();
            if (isAnyAddress(normalized)) continue;
            return normalized;
        }
        var detected = detectLocalIp();
        return detected == null || detected.isBlank() ? "127.0.0.1" : detected;
    }

    private boolean isUsableSpecificHost(String host) {
        return host != null
            && !host.isBlank()
            && !isAnyAddress(host)
            && !isLoopbackHost(host);
    }

    private static final class PromptLocale {
        final String key;
        final String prompt;
        final String yes;
        final String no;
        final String hover;
        final String clickHint;
        final String adblockHint;

        PromptLocale(String key,
                     String prompt,
                     String yes,
                     String no,
                     String hover,
                     String clickHint,
                     String adblockHint) {
            this.key = key;
            this.prompt = prompt;
            this.yes = yes;
            this.no = no;
            this.hover = hover;
            this.clickHint = clickHint;
            this.adblockHint = adblockHint;
        }

        static PromptLocale defaultEn() {
            return new PromptLocale(
                "en",
                "[TurboAgent] Use the agent?",
                "[Yes]",
                "[No]",
                "Click to open",
                "Press \"t\" or \"/\" before clicking the link.",
                "If blocks do not appear, try disabling your browser ad-blocker."
            );
        }

        static PromptLocale defaultJa() {
            return new PromptLocale(
                "ja",
                "[TurboAgent] エージェントを使いますか？",
                "[はい]",
                "[いいえ]",
                "クリックで開く",
                "クリックするには「t」か「/」を押してからクリックしてください。",
                "コードブロックが表示されない場合は、ブラウザの広告ブロック機能を無効にしてみてください。"
            );
        }

        static PromptLocale fromJson(JSONObject json) {
            if (json == null) return null;
            var key = json.optString("key", "").trim();
            var base = switch (key) {
                case "ja" -> defaultJa();
                default -> defaultEn();
            };
            return new PromptLocale(
                key.isBlank() ? base.key : key,
                json.optString("prompt", base.prompt),
                json.optString("yes", base.yes),
                json.optString("no", base.no),
                json.optString("hover", base.hover),
                json.optString("clickHint", base.clickHint),
                json.optString("adblockHint", base.adblockHint)
            );
        }
    }

    private static String detectLocalIp() {
        try {
            java.util.Enumeration<java.net.NetworkInterface> ifaces = java.net.NetworkInterface.getNetworkInterfaces();
            java.net.InetAddress firstNonLoopback = null;
            while (ifaces != null && ifaces.hasMoreElements()) {
                var iface = ifaces.nextElement();
                if (iface == null || !iface.isUp() || iface.isLoopback()) continue;
                var addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    var addr = addrs.nextElement();
                    if (addr.isLoopbackAddress() || addr.isAnyLocalAddress()) continue;
                    if (addr instanceof java.net.Inet6Address && ((java.net.Inet6Address) addr).isLinkLocalAddress()) continue;
                    if (addr.isLinkLocalAddress()) continue;
                    if (addr.isSiteLocalAddress() && addr instanceof java.net.Inet4Address) {
                        return addr.getHostAddress();
                    }
                    if (firstNonLoopback == null) {
                        firstNonLoopback = addr;
                    }
                }
            }
            if (firstNonLoopback != null) return firstNonLoopback.getHostAddress();
            var local = java.net.InetAddress.getLocalHost();
            if (local != null && !local.isLoopbackAddress() && !local.isAnyLocalAddress()) return local.getHostAddress();
        } catch (Exception ignored) {}
        return null;
    }

    private static boolean isAnyAddress(String host) {
        var normalized = host.trim();
        return normalized.equals("0.0.0.0")
            || normalized.equals("::")
            || normalized.equals("::0")
            || normalized.equals("*");
    }

    private static boolean isLoopbackHost(String host) {
        if (host == null) return true;
        var normalized = host.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("localhost")
            || normalized.equals("127.0.0.1")
            || normalized.startsWith("127.")
            || normalized.equals("::1")
            || normalized.equals("[::1]");
    }

    private static String buildWsDefaultUrl(String host, int port, String scheme) {
        var effectiveHost = (host == null || host.isBlank()) ? "127.0.0.1" : host;
        var bracketed = effectiveHost.startsWith("[") && effectiveHost.endsWith("]");
        var needsBrackets = effectiveHost.contains(":") && !bracketed;
        var normalizedHost = needsBrackets ? "[" + effectiveHost + "]" : effectiveHost;
        var effectiveScheme = (scheme == null || scheme.isBlank()) ? "ws" : scheme.trim().toLowerCase(Locale.ROOT);
        if (!effectiveScheme.equals("wss") && !effectiveScheme.equals("ws")) {
            effectiveScheme = "ws";
        }
        return effectiveScheme + "://" + normalizedHost + ":" + port;
    }

    private record AgentEntry(UUID entityId, String owner) {}

    private record MagicToken(String player, long expiresAt) {}

    private static class AgentInventory {
        final ItemStack[] slots = new ItemStack[27];
        int activeSlot = -1;
    }
}
