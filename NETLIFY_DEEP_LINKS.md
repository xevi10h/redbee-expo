# 🚀 Configuración de Deep Links con Netlify

## ✅ Cambios Realizados

### 1. **Script de Build Actualizado**
- `/scripts/web-build.js` ahora copia automáticamente los archivos `.well-known` al directorio `dist/`

### 2. **Netlify Configuration Actualizada**
- `netlify.toml` configurado para servir archivos `.well-known` correctamente
- Headers `Content-Type: application/json` configurados
- Excluidos de redirecciones SPA

### 3. **Archivos de Verificación Listos**
- ✅ `website-files/.well-known/assetlinks.json` - Android (con tu SHA-256)
- ✅ `website-files/.well-known/apple-app-site-association` - iOS (con tu Team ID)

## 🔧 Pasos para Desplegar

### 1. **Ejecutar Build Web**
```bash
npm run build:netlify
```

Esto automáticamente:
- Construirá la app web
- Copiará los archivos `.well-known` a `dist/.well-known/`
- Preparará todo para Netlify

### 2. **Verificar Archivos Localmente**
Después del build, verifica que estos archivos existen:
```
dist/.well-known/assetlinks.json
dist/.well-known/apple-app-site-association
```

### 3. **Desplegar a Netlify**
```bash
# Si usas Netlify CLI
netlify deploy --prod

# O simplemente hacer push a tu repositorio si tienes auto-deploy configurado
git add .
git commit -m "Add deep links configuration"
git push origin main
```

## ✅ Verificación Post-Despliegue

### 1. **Verificar URLs Directamente**
Estas URLs deben funcionar después del despliegue:

```
https://redbeeapp.com/.well-known/assetlinks.json
https://redbeeapp.com/.well-known/apple-app-site-association
```

### 2. **Verificar Content-Type**
```bash
curl -I https://redbeeapp.com/.well-known/assetlinks.json
```

Debe devolver:
```
Content-Type: application/json
```

### 3. **Verificar con Herramientas Oficiales**

#### Android Asset Links:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://redbeeapp.com&relation=delegate_permission/common.handle_all_urls
```

#### iOS Associated Domains:
- Accede a `https://redbeeapp.com/.well-known/apple-app-site-association`
- Debe devolver JSON válido

## 🧪 Testing Deep Links

### 1. **En Desarrollo (con archivos locales)**
```bash
# iOS
npx uri-scheme open "https://redbeeapp.com/profile/123" --ios

# Android  
npx uri-scheme open "https://redbeeapp.com/profile/123" --android
```

### 2. **En Dispositivos Reales (después del despliegue)**
- Instala la app desde stores
- Abre un link `https://redbeeapp.com/profile/123` desde otro app
- La app debería abrirse automáticamente

## 📱 Flujo Completo

```
1. Usuario hace click en: https://redbeeapp.com/profile/123
2. Sistema verifica archivos .well-known
3. Si app está instalada → Abre app directamente
4. Si app no está instalada → Abre web browser
```

## 🚨 Troubleshooting

### ❌ Archivos .well-known no se encuentran
```bash
# Verificar que el build los copió
ls -la dist/.well-known/

# Re-ejecutar build si es necesario
npm run build:netlify
```

### ❌ Content-Type incorrecto
- Netlify debería automáticamente servir con `application/json`
- Si no funciona, verifica que `netlify.toml` está correctamente configurado

### ❌ Deep links no funcionan después de despliegue
1. Verifica que los archivos son accesibles vía web
2. Reinstala la app móvil (iOS/Android cache los archivos)
3. Espera propagación (puede tomar algunas horas)

## 🎯 Resultado Esperado

Después del despliegue, estas URLs deberían abrir la app automáticamente:
- `https://redbeeapp.com/profile/[id]`
- `https://redbeeapp.com/video/[id]` 
- `https://redbeeapp.com/hashtag/[name]`
- `https://redbeeapp.com/auth/confirm-email`
- `https://redbeeapp.com/auth/confirm-password`

## ⚡ Comandos Rápidos

```bash
# Build y desplegar en un comando
npm run build:netlify && netlify deploy --prod

# Verificar archivos después del build
ls -la dist/.well-known/ && cat dist/.well-known/assetlinks.json

# Test rápido de deep link
curl -s https://redbeeapp.com/.well-known/assetlinks.json | jq .
```

¡Los deep links con Netlify están listos! 🚀