# Android release: firma, AAB y Google Play

Documento operativo de la app móvil Android de DOVEXO (`apps/mobile`).
Estado verificado el 2026-11-10.

## Estado real hoy

- La **keystore de release** fue generada en `.local/android-keystore/` y sus
  cuatro secretos están cargados en GitHub Actions.
- El workflow `android-release.yml` **ya se ejecutó con éxito** y generó el
  artifact `dovexo-android-aab` (36 MB), firmado con la keystore de release y
  verificado contra su huella SHA-256.
- El AAB **no se subió a Google Play**: falta la cuenta de Play Console y la
  prueba interna.
- El APK publicado (`mobile-apk-3`) está firmado con la **keystore de debug** y
  corresponde a la identidad anterior. Sirve para probar, **no** para Google
  Play.
- La app **no** fue instalada ni probada todavía en un dispositivo Android real.

## Identificadores definitivos

| Campo | Valor |
| --- | --- |
| `expo.name` | `DOVEXO` |
| `expo.slug` | `dovexo` |
| `expo.scheme` (deep link) | `dovexo://` |
| `android.package` / applicationId | `com.dovexo.mobile` |
| `ios.bundleIdentifier` | `com.dovexo.mobile` |
| `android.versionCode` | `1` |
| `expo.version` (versionName) | `1.0.0` |

El `applicationId` **no se puede cambiar** después de la primera subida a Google
Play. Si cambia, Play lo trata como otra app y los usuarios no reciben
actualizaciones. Confirmar el nombre comercial y el dominio antes de la primera
subida.

`versionCode` debe incrementarse en **cada** AAB que se suba. `versionName` es el
número visible para el usuario.

## APK vs AAB

| | APK | AAB |
| --- | --- | --- |
| Uso | Instalar a mano en un dispositivo | Subir a Google Play |
| Genera | `assembleRelease` | `bundleRelease` |
| Workflow | `android-apk.yml` (firma debug) | `android-release.yml` (firma release) |
| Salida | `android/app/build/outputs/apk/release/app-release.apk` | `android/app/build/outputs/bundle/release/app-release.aab` |

Play genera los APK por dispositivo a partir del AAB. El AAB no se instala
directamente con `adb install`.

## Keystore de release

Generación (una sola vez, en la máquina del fundador):

```powershell
.\scripts\generate-android-keystore.ps1
```

- Archivo: `.local/android-keystore/dovexo-release.keystore`
- Alias por defecto: `dovexo-release`
- Formato: PKCS12, RSA 4096, validez 10.000 días.
- `.local/` está en `.gitignore`; además el repo ignora `*.keystore` y `*.jks`.
- La contraseña se pide enmascarada o se toma de `ANDROID_KEYSTORE_PASSWORD`.
  El script nunca la imprime ni la escribe en disco.
- Si el keystore ya existe, el script **no lo sobrescribe**. Regenerarlo invalida
  todas las actualizaciones futuras en Play.

El script imprime la huella SHA-256 del certificado. Guardarla: sirve para
verificar que el AAB quedó firmado con la keystore correcta y para el alta de
Play App Signing.

### Backup obligatorio

1. Copiar el `.keystore` a un gestor de contraseñas o almacenamiento cifrado
   fuera del repositorio y fuera de esta máquina.
2. Guardar la contraseña y el alias en una entrada separada del mismo gestor.
3. Probar el backup: copiar el archivo a otra carpeta y ejecutar
   `keytool -list -v -keystore <copia> -alias dovexo-release`. Debe responder.
4. Registrar en el gestor la fecha de creación y la huella SHA-256.
5. Si se pierde la keystore y no hay Play App Signing activo, la app no se puede
   actualizar nunca más: hay que publicar una app nueva con otro applicationId.

## Secretos de GitHub Actions

Configurar en `Settings > Secrets and variables > Actions` del repositorio:

| Secreto | Contenido |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keystore codificado en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | contraseña del keystore |
| `ANDROID_KEY_ALIAS` | alias, por ejemplo `dovexo-release` |
| `ANDROID_KEY_PASSWORD` | contraseña de la clave (igual al del keystore en PKCS12) |

Generar el base64 sin imprimirlo en consola:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\.local\android-keystore\dovexo-release.keystore")) | Set-Clipboard
```

Nunca pegar el keystore, su base64 ni las contraseñas en un issue, un commit, un
chat o un archivo del repositorio.

## Workflow de AAB

`.github/workflows/android-release.yml`:

1. Falla con `::error::` si falta cualquiera de los cuatro secretos. Nunca cae a
   firma debug.
2. Instala dependencias y ejecuta `expo prebuild -p android --no-install`.
3. Restaura la keystore desde base64 en `$RUNNER_TEMP` con permisos 600.
4. Parchea `android/app/build.gradle` (archivo generado, no versionado) para
   agregar `signingConfigs.release` y usarlo en el build type `release`.
5. Ejecuta `./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`.
6. Verifica que la huella SHA-256 del AAB coincida con la de la keystore.
7. Publica el AAB como artifact `dovexo-android-aab` (30 días).

Disparadores: manual (`workflow_dispatch`) con `version_code` y `version_name`
opcionales, o un tag `android-v*`.

El workflow **no sube nada a Play**: la carga es manual desde Play Console.

## Google Play Console

Bloqueado: no hay cuenta de desarrollador.

1. Crear cuenta de desarrollador (pago único) con la cuenta de ARVOKTA.
2. Verificar identidad de la organización (documentación fiscal).
3. Crear la app: nombre `DOVEXO`, idioma predeterminado español (Argentina),
   tipo "Aplicación", gratuita.
4. Activar Play App Signing. Google guarda la clave de firma de distribución; la
   keystore propia pasa a ser la **upload key**.
5. Completar la ficha: descripción, ícono 512x512, feature graphic 1024x500, al
   menos 2 capturas de teléfono, categoría.
6. Política de privacidad pública (URL obligatoria) y formulario Data safety.
7. Clasificación de contenido y público objetivo.
8. Subir el AAB a **prueba interna** (Internal testing), agregar testers por
   email y publicar.
9. Probar el enlace de la prueba interna en un dispositivo real.

Notas:

- Play exige `targetSdkVersion` reciente. La app usa el que fija el SDK de Expo;
  revisarlo antes de subir.
- Un AAB con `versionCode` ya usado se rechaza.
- Los cambios de ficha y la revisión inicial pueden demorar días.

## Checklist físico obligatorio

No declarar la app lista hasta completar esta lista en un Android real, con el
AAB de prueba interna (no con el APK debug).

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | Instalación desde Play (prueba interna) | pendiente |
| 2 | Actualización desde una versión anterior | pendiente |
| 3 | Login de técnico | pendiente |
| 4 | Refresh de sesión y expiración de credenciales | pendiente |
| 5 | Lista de trabajos y filtros | pendiente |
| 6 | Detalle de la orden | pendiente |
| 7 | Cambio de estados con historial | pendiente |
| 8 | Llamada y navegación a la dirección | pendiente |
| 9 | Cámara y permisos | pendiente |
| 10 | Carga de fotos | pendiente |
| 11 | Materiales y notas | pendiente |
| 12 | Modo offline (avión) y sincronización | pendiente |
| 13 | Reintentos y ausencia de duplicados (idempotencia) | pendiente |
| 14 | Push: recepción y deep link | pendiente |
| 15 | Logout y borrado de tokens | pendiente |
| 16 | Portal del cliente en la app | pendiente |

Registrar cada resultado con fecha, modelo de teléfono y versión de Android.

## Comandos locales

```powershell
# Iconos (letra D, misma paleta)
.\scripts\generate-mobile-icons.ps1

# Keystore de release
.\scripts\generate-android-keystore.ps1

# Build local de AAB (requiere JDK 21 y Android SDK)
. .\scripts\android-env.ps1
cd apps/mobile
pnpm exec expo prebuild -p android --clean --no-install
cd android
.\gradlew.bat bundleRelease
```

## Nota sobre `apps/mobile/android/`

`android/` es un directorio generado por `expo prebuild` y está en `.gitignore`.
Después del cambio de identidad, cualquier copia local anterior sigue con
`com.arreglo.mobile`: hay que regenerarlo antes de compilar.

```powershell
cd apps/mobile
pnpm exec expo prebuild -p android --clean --no-install
```

No editar `android/` a mano.

## Pendientes y bloqueos

- [ ] Cuenta de Google Play Console (bloqueo externo).
- [ ] Keystore de release generada y respaldada (acción del fundador).
- [ ] Secretos de firma cargados en GitHub.
- [ ] Primer AAB generado y verificado.
- [ ] Prueba interna publicada.
- [ ] Checklist físico completo.
- [ ] `eas projectId` y FCM para push real.
- [ ] Dominio propio y política de privacidad antes de la ficha de Play.