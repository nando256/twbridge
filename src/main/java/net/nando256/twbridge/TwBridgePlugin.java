package net.nando256.twbridge;

import net.nando256.twbridge.http.TwHttpServer;
import net.nando256.twbridge.ws.BridgeServer;
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
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.player.PlayerInteractAtEntityEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;
import org.bukkit.inventory.meta.SkullMeta;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.util.EulerAngle;
import org.bukkit.util.Vector;

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
    private TwHttpServer httpServer;
    private final Map<String, AgentEntry> agents = new ConcurrentHashMap<>();
    private boolean debug;

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

        String wsAddr = firstNonBlank(
            getConfig().getString("ws.bindAddress"),
            getConfig().getString("ws.address"),
            "0.0.0.0"
        );
        int wsPort = getConfig().getInt("ws.port", 8787);
        int rate = getConfig().getInt("ws.maxMsgPerSecond", 30);
        int maxBytes = getConfig().getInt("ws.maxMsgBytes", 8192);
        var origins = new java.util.HashSet<>(getConfig().getStringList("ws.originWhitelist"));
        boolean pairingRequired = getConfig().getBoolean(
            "ws.requirePairing",
            getConfig().getBoolean("pairing.enabled", true)
        );
        int pairWindowSec = getConfig().getInt("pairing.windowSeconds", 60);
        var clientHost = chooseClientHost(
            getConfig().getString("http.wsAddress"),
            getConfig().getString("ws.advertiseAddress"),
            wsAddr
        );
        String wsDefaultUrl = buildWsDefaultUrl(clientHost, wsPort);

        try {
            wsServer = new BridgeServer(this, wsAddr, wsPort, origins, rate, maxBytes, pairingRequired, pairWindowSec);
            wsServer.setReuseAddr(true);
            wsServer.start();
            getLogger().info("WS: ws://" + wsAddr + ":" + wsPort);
        } catch (Exception e) {
            getLogger().severe("WS Server Failed: " + e.getMessage());
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        if (getConfig().getBoolean("http.enabled", true)) {
            String hAddr = firstNonBlank(
                getConfig().getString("http.bindAddress"),
                getConfig().getString("http.address"),
                "0.0.0.0"
            );
            int hPort = getConfig().getInt("http.port", 8788);
            String hPath = getConfig().getString("http.path", "/tw/twbridge.js");
            var cors = getConfig().getStringList("http.corsAllowOrigins");
            int cache = getConfig().getInt("http.cacheSeconds", 60);
            try {
                httpServer = new TwHttpServer(this, hAddr, hPort, hPath, cors, cache, wsDefaultUrl);
                httpServer.start();
                getLogger().info("HTTP: http://" + hAddr + ":" + hPort + hPath);
            } catch (Exception e) {
                getLogger().severe("HTTP Server Failed: " + e.getMessage());
            }
        }
    }

    private void stopServers() {
        if (httpServer != null) { httpServer.stop(); httpServer = null; }
        if (wsServer != null) { try { wsServer.stop(1000); } catch (Exception ignored) {} wsServer = null; }
        cleanupAgents();
    }

    @Override
    public boolean onCommand(CommandSender s, Command c, String l, String[] a) {
        if (!s.hasPermission("twbridge.admin")) { s.sendMessage("No permission"); return true; }
        if (a.length == 0) { s.sendMessage("/twbridge reload | pair"); return true; }
        switch (a[0].toLowerCase(Locale.ROOT)) {
            case "reload" -> { reloadConfig(); applyConfigAndStart(); s.sendMessage("twbridge reloaded."); }
            case "pair" -> {
                if (wsServer == null) { s.sendMessage("WS server not running."); break; }
                var code = wsServer.rotatePairCode();
                if (code == null) {
                    s.sendMessage("Pairing is disabled (ws.requirePairing = false).");
                } else {
                    int ttl = getConfig().getInt("pairing.windowSeconds", 60);
                    s.sendMessage("Pair code: " + code + " (valid " + ttl + "s)");
                }
            }
        }
        return true;
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
            logDebug("Despawned agent " + agentId);
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
        return switch (direction) {
            case "forward" -> forward;
            case "back" -> forward.clone().multiply(-1);
            case "right" -> right;
            case "left" -> right.clone().multiply(-1);
            default -> null;
        };
    }

    private String normalizeDirection(String direction) {
        if (direction == null) return null;
        return switch (direction.trim().toLowerCase(Locale.ROOT)) {
            case "forward", "back", "right", "left" -> direction.trim().toLowerCase(Locale.ROOT);
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

    private static String agentMapKey(String ownerName, String agentId) {
        var ownerPart = ownerName == null ? "" : ownerName.trim().toLowerCase(Locale.ROOT);
        var agentPart = agentId == null ? "" : agentId.trim();
        return ownerPart + "." + agentPart;
    }

    private static String firstNonBlank(String... candidates) {
        for (var c : candidates) {
            if (c != null && !c.isBlank()) return c;
        }
        return null;
    }

    private static String chooseClientHost(String... candidates) {
        for (var candidate : candidates) {
            if (candidate == null || candidate.isBlank()) continue;
            var normalized = candidate.trim();
            if (isAnyAddress(normalized)) continue;
            return normalized;
        }
        return "127.0.0.1";
    }

    private static boolean isAnyAddress(String host) {
        var normalized = host.trim();
        return normalized.equals("0.0.0.0")
            || normalized.equals("::")
            || normalized.equals("::0")
            || normalized.equals("*");
    }

    private static String buildWsDefaultUrl(String host, int port) {
        var effectiveHost = (host == null || host.isBlank()) ? "127.0.0.1" : host;
        var bracketed = effectiveHost.startsWith("[") && effectiveHost.endsWith("]");
        var needsBrackets = effectiveHost.contains(":") && !bracketed;
        var normalizedHost = needsBrackets ? "[" + effectiveHost + "]" : effectiveHost;
        return "ws://" + normalizedHost + ":" + port;
    }

    private record AgentEntry(UUID entityId, String owner) {}
}
