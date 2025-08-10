# ✅ Configuración Completa de Deep Links para Redbee

## Cambios Realizados en el Código

### ✅ 1. Configuración en `app.json`
- Añadido `associatedDomains: ["applinks:redbeeapp.com"]`
- Configurado iOS entitlements con `com.apple.developer.associated-domains`
- Añadido Android intent filters para `https://redbeeapp.com`

### ✅ 2. Hook de Deep Links (`hooks/useDeepLinks.ts`)
- Maneja URLs universales (`https://redbeeapp.com/profile/123`)
- Maneja custom scheme (`redbeeapp://auth/confirm-email`)
- Navegación automática a pantallas correctas

### ✅ 3. Integración en Layout
- Deep links handler integrado en `app/_layout.tsx`

## 🔧 Pasos Requeridos Fuera del Código

### 1. **Configurar tu Dominio Web**

Sube los archivos de verificación a tu servidor web en `https://redbeeapp.com`:

#### Para Android:
```
https://redbeeapp.com/.well-known/assetlinks.json
```

#### Para iOS:
```
https://redbeeapp.com/.well-known/apple-app-site-association
```

**⚠️ Importante**: Estos archivos deben ser accesibles sin autenticación y servirse con el content-type correcto.

### 2. **Obtener SHA-256 Fingerprint para Android**

Necesitas obtener el SHA-256 fingerprint de tu certificado de Android:

#### Para Debug (desarrollo):
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Para Release (producción):
```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your_key_alias
```

**Actualiza el archivo `assetlinks.json`** reemplazando `"SHA256_FINGERPRINT_AQUI"` con tu fingerprint real.

### 3. **Obtener Apple Team ID**

1. Ve a [Apple Developer Console](https://developer.apple.com)
2. Ve a **Membership** en tu cuenta
3. Copia tu **Team ID** (formato: `ABCD123456`)

**Actualiza el archivo `apple-app-site-association`** reemplazando `"TEAM_ID"` con tu Team ID real.

### 4. **Configurar Apple Developer Console**

1. Ve a tu App ID en Apple Developer Console
2. En **App Services**, habilita **Associated Domains**
3. En tu Provisioning Profile, asegúrate de que **Associated Domains** esté habilitado

### 5. **Configurar Google Play Console (Android)**

1. Ve a Google Play Console
2. En tu app, ve a **Setup > App integrity**
3. En **App signing key certificate**, copia el **SHA-256 certificate fingerprint**
4. Úsalo en el archivo `assetlinks.json`

### 6. **Testing de Deep Links**

#### Probar en Desarrollo:
```bash
# iOS Simulator
npx uri-scheme open "https://redbeeapp.com/profile/123" --ios

# Android Emulator  
npx uri-scheme open "https://redbeeapp.com/profile/123" --android
```

#### Probar Custom Scheme:
```bash
# iOS
npx uri-scheme open "redbeeapp://auth/confirm-email" --ios

# Android
npx uri-scheme open "redbeeapp://auth/confirm-email" --android
```

## 📱 URLs Soportadas

### Universal Links (https://redbeeapp.com):
- `https://redbeeapp.com/profile/[id]` → `/user/[id]`
- `https://redbeeapp.com/video/[id]` → `/video/[id]`
- `https://redbeeapp.com/hashtag/[hashtag]` → `/hashtag/[hashtag]`
- `https://redbeeapp.com/auth/confirm-email` → `/auth/confirm-email`
- `https://redbeeapp.com/auth/confirm-password` → `/auth/confirm-password`

### Custom Scheme (redbeeapp://):
- `redbeeapp://auth/confirm-email` → `/auth/confirm-email`
- `redbeeapp://auth/confirm-password` → `/auth/confirm-password`

## 🌐 Configuración del Servidor Web

### Nginx Configuration:
```nginx
location /.well-known/assetlinks.json {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

location /.well-known/apple-app-site-association {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

### Apache Configuration:
```apache
<Files "assetlinks.json">
    Header set Content-Type "application/json"
</Files>

<Files "apple-app-site-association">
    Header set Content-Type "application/json"
</Files>
```

## 🔍 Verificación

### Verificar Android Asset Links:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://redbeeapp.com&relation=delegate_permission/common.handle_all_urls
```

### Verificar iOS Associated Domains:
1. Ve a `https://redbeeapp.com/.well-known/apple-app-site-association`
2. Debe devolver un JSON válido
3. Content-Type debe ser `application/json`

## 📋 Checklist de Implementación

### Antes de la Release:
- [ ] Archivos `.well-known` subidos y accesibles
- [ ] SHA-256 fingerprint correcto en `assetlinks.json`
- [ ] Apple Team ID correcto en `apple-app-site-association`
- [ ] Associated Domains habilitado en Apple Developer Console
- [ ] App signing configurado en Google Play Console
- [ ] Testing en dispositivos físicos completado

### Después de la Release:
- [ ] Verificar URLs con herramientas de Google/Apple
- [ ] Testear deep links en dispositivos reales
- [ ] Monitorear logs para errores de deep links

## 🚨 Troubleshooting

### Deep Links no funcionan en iOS:
1. Verifica que el Team ID sea correcto
2. Asegúrate de que Associated Domains esté habilitado
3. Reinstala la app después de subir los archivos `.well-known`
4. Verifica que el archivo sea accesible vía HTTPS

### Deep Links no funcionan en Android:
1. Verifica el SHA-256 fingerprint
2. Asegúrate de usar el fingerprint correcto (debug vs release)
3. Verifica que `autoVerify: true` esté en `app.json`
4. Reinstala la app después de configurar `assetlinks.json`

### Archivo .well-known no se puede acceder:
1. Verifica permisos del servidor
2. Asegúrate de que no requiera autenticación
3. Verifica que el content-type sea `application/json`
4. Prueba acceder directamente desde el navegador

## 📖 Documentación Adicional

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Apple Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)

## ✅ Estado de Implementación

- ✅ Configuración de app (`app.json`)
- ✅ Handler de deep links (`useDeepLinks.ts`)
- ✅ Integración en navegación
- ✅ Archivos de verificación creados
- ⏳ **Pendiente**: Subir archivos a servidor web
- ⏳ **Pendiente**: Configurar certificados y Team IDs
- ⏳ **Pendiente**: Testing en dispositivos reales