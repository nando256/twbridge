import io.papermc.hangarpublishplugin.model.Platforms
import org.gradle.api.tasks.compile.JavaCompile
import org.gradle.jvm.tasks.Jar

plugins {
    java
    `maven-publish`
    id("com.github.johnrengelman.shadow") version "8.1.1"
    id("io.papermc.hangar-publish-plugin") version "0.1.3"
}

group = "net.nando256.twbridge"
version = (findProperty("version.override") as String?) ?: "0.1.0"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.1-R0.1-SNAPSHOT")
    implementation("org.java-websocket:Java-WebSocket:1.5.6")
    implementation("org.json:json:20240303")
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.release.set(21)
}

tasks.processResources {
    filesMatching("plugin.yml") {
        expand("version" to project.version)
    }
}

tasks {
    withType<Jar>().configureEach {
        archiveBaseName.set("twbridge")
    }

    shadowJar {
        archiveClassifier.set("")
    }

    jar {
        enabled = false
    }

    build {
        dependsOn(shadowJar)
    }
}

hangarPublish {
    publications.register("plugin") {
        id.set("twbridge")
        version.set(project.version.toString())
        channel.set(providers.gradleProperty("hangar.channel").orElse("Snapshot"))
        apiKey.set(System.getenv("HANGAR_API_TOKEN"))

        platforms {
            register(Platforms.PAPER) {
                jar.set(tasks.shadowJar.flatMap { it.archiveFile })
                val versionsProp = (findProperty("paperVersion") as String?) ?: "1.21.1"
                platformVersions.set(versionsProp.split(',').map { it.trim() })
            }
        }
    }
}
