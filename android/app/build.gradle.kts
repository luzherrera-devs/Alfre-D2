plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ar.comunicador.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "ar.comunicador.tv"
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    // La app web vive en /web (una sola copia): se empaqueta tal cual como asset.
    sourceSets {
        getByName("main") {
            assets.srcDirs("../../web")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
