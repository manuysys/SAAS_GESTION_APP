# App móvil Android

## Estado

- App Expo / React Native en `apps/mobile`.
- Android primero. iOS requiere macOS o EAS Build.
- Backend: `docs/MOBILE_API.md`.
- La app usa la misma API que la web.

## Desarrollo con Expo Go

```powershell
cd apps/mobile
pnpm install
pnpm start
```

Escanear el QR con Expo Go en Android. La app usa
`EXPO_PUBLIC_API_URL=https://saas-gestion-api.vercel.app` por defecto.

## Variables

Crear `apps/mobile/.env.local`:

```env
EXPO_PUBLIC_API_URL=https://saas-gestion-api.vercel.app
EXPO_PUBLIC_DEMO_TENANT_SLUG=servicios-demo
```

## Build local de Android

Requisitos:

- JDK 21.
- Android SDK con `platform-tools`, `platforms;android-36` y
  `build-tools;36.0.0`.
- El SDK local se instala en `.local/android-sdk` con
  `.local/install-android-sdk.ps1`.

```powershell
. .\scripts\android-env.ps1
cd apps/mobile
pnpm exec expo prebuild -p android
cd android
.\gradlew.bat assembleRelease
```

> `expo prebuild` regenera `android/` a partir de `app.json`. Si cambiás el
> icono, el splash, el package o los permisos, volvé a ejecutarlo antes de
> compilar. No edites `android/` a mano.

### Windows y rutas largas

El proyecto usa `nodeLinker: hoisted` en `apps/mobile/pnpm-workspace.yaml`. Sin
eso, pnpm crea rutas en `node_modules/.pnpm/...` que superan el límite de 260
caracteres de Windows y el build falla al ejecutar `prefab_command.bat`. Si hay
que reinstalar:

```powershell
cd apps/mobile
pnpm install
pnpm exec expo prebuild -p android --clean --no-install
```

Gradle descarga automáticamente el NDK 27.1, CMake 3.22.1, Ninja y
`build-tools` si el SDK está configurado pero no los tiene.

Si el repositorio está en una ruta muy larga y Ninja falla con
`manifest 'build.ninja' still dirty after 100 tries` o `mkdir ... No such file
or directory`, compilá desde una copia en una ruta corta:

```powershell
robocopy apps\mobile C:\m /E /XD node_modules android .expo dist dist-android
cd C:\m
pnpm install
pnpm exec expo prebuild -p android --clean --no-install
```

Antes de compilar, si el error de `mkdir` sigue, agregá al inicio de
`android/app/build.gradle`:

```groovy
buildDir = "C:/b/app"
```

Eso acorta la ruta de los objetos nativos. El APK queda en
`C:\b\app\outputs\apk\release\app-release.apk`.

Para generar un APK solo para teléfonos modernos (arm64) y reducir el tiempo de
compilación:

```powershell
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

El APK queda en:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Firma actual: el perfil local usa la keystore de debug que genera Expo. El APK
sirve para probar en un dispositivo real, pero **no es publicable en Google
Play**. Para producción usá EAS con una keystore propia o configurá
`signingConfigs.release`.

Para debug:

```powershell
.\gradlew.bat assembleDebug
```

## Build en la nube con EAS

```powershell
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

El perfil `preview` genera un APK instalable. El perfil `production` genera un
AAB para Google Play.

## Build en GitHub Actions

El workflow `.github/workflows/android-apk.yml` compila un APK arm64 **firmado
con la keystore de debug** y lo publica como artifact
`dovexo-android-apk-debug` y como release asset. Se ejecuta al cambiar
`apps/mobile/**` o manualmente con `workflow_dispatch`. Evita los límites de ruta
de Windows y no requiere una máquina local.

Para el AAB firmado con la keystore de release ver
`.github/workflows/android-release.yml` y `docs/ANDROID_RELEASE.md`.

APK de prueba publicado:

```text
https://github.com/manuysys/SAAS_GESTION_APP/releases/tag/mobile-apk-3
```

## Android

- Nombre: `DOVEXO`.
- Package / applicationId: `com.dovexo.mobile`.
- Slug y scheme: `dovexo`. Deep link: `dovexo://tech/job/{id}` y
  `dovexo://customer/order/{id}`.
- Version code inicial: `1`. Version name: `1.0.0`.
- Permisos: cámara, imágenes y notificaciones.
- El applicationId no se puede cambiar después de la primera subida a Play.

## Publicación

- Google Play Console: cuenta de desarrollador (pago único), ficha de la app,
  política de privacidad pública, data safety y capturas.
- Apple: Apple Developer Program (anual) y TestFlight/App Store.
- No publicar hasta probar login, trabajos, fotos, offline y portal del cliente
  en un dispositivo real.

## Limitaciones actuales

- Sin Android SDK no se puede generar el APK local.
- Sin cuenta de Expo no se puede usar EAS Build.
- Sin dominio propio, la app usa la URL de Vercel.
- La PWA sigue disponible como fallback.
