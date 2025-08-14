# Legal Pages Deployment Guide

## 📋 Resumen

Se han creado las páginas legales (Términos de Servicio y Política de Privacidad) con soporte multi-idioma. Las páginas están listas para ser desplegadas, pero actualmente las URLs de producción no están disponibles.

## 🌐 URLs Esperadas (Post-Deployment)

### Términos de Servicio:
- Español: `https://redbeeapp.com/terms/es_ES`
- Inglés: `https://redbeeapp.com/terms/en_US`

### Política de Privacidad:
- Español: `https://redbeeapp.com/privacy/es_ES`
- Inglés: `https://redbeeapp.com/privacy/en_US`

## 📁 Estructura de Archivos Creados

```
website-files/
├── terms/
│   ├── es_ES/
│   │   └── index.html
│   └── en_US/
│       └── index.html
└── privacy/
    ├── es_ES/
    │   └── index.html
    └── en_US/
        └── index.html
```

## 🚀 Pasos para el Despliegue

### 1. Build Web
Las páginas se incluyen automáticamente en el build web:
```bash
npm run web-build
```

### 2. Deploy to Production
Una vez que el build esté completo, las páginas se copiarán a:
```
dist/
├── terms/
│   ├── es_ES/index.html
│   └── en_US/index.html
└── privacy/
    ├── es_ES/index.html
    └── en_US/index.html
```

### 3. Verificar Dominio
Asegúrate de que `redbeeapp.com` esté configurado y funcionando correctamente.

## ⚙️ Configuración de URLs por Entorno

Se ha creado el archivo `shared/utils/webUrls.ts` que maneja las URLs dinámicamente:

### Entornos Configurados:
- **Development**: `http://localhost:8081` (Expo web dev server)
- **Staging**: `https://redbee-expo.netlify.app`
- **Production**: `https://redbeeapp.com`

### Para cambiar el entorno temporalmente:
Edita el archivo `shared/utils/webUrls.ts` y cambia la función `getWebBaseUrl()`:

```typescript
export function getWebBaseUrl(): string {
  // Para testing, usar staging temporalmente:
  return WEB_URLS.staging;
  
  // O para desarrollo local:
  return WEB_URLS.development;
}
```

## 🔗 Enlaces Implementados

### Registro de Usuario
- Checkbox: "Al registrarte, aceptas nuestros [Términos de servicio] y [Política de privacidad]"
- Los textos son clickeables y abren las páginas correspondientes

### Configuración de Perfil
- Sección "Legal" con enlaces a ambos documentos
- Los enlaces usan el idioma configurado del usuario

## 🧪 Testing

### Desarrollo Local
1. Hacer el build: `npm run build:production`
2. Servir el directorio dist: `npm run preview` 
3. Las páginas estarán disponibles en:
   - `http://localhost:3000/terms/es_ES`
   - `http://localhost:3000/terms/en_US`
   - `http://localhost:3000/privacy/es_ES`
   - `http://localhost:3000/privacy/en_US`
4. Probar fallbacks:
   - `http://localhost:3000/terms/ddddd` → redirige a `/terms/es_ES`
   - `http://localhost:3000/privacy/invalid` → redirige a `/privacy/es_ES`

### Staging (Netlify)
Si las páginas están desplegadas en Netlify:
- `https://redbee-expo.netlify.app/terms/es_ES`
- `https://redbee-expo.netlify.app/privacy/es_ES`

## ⚠️ Estado Actual

**Las URLs de producción aún no están disponibles.** Los enlaces mostrarán un mensaje de error hasta que:

1. El dominio `redbeeapp.com` esté configurado correctamente
2. Las páginas sean desplegadas a producción
3. Las rutas estén funcionando correctamente

## 🔄 Actualizar URLs Cuando Estén Listas

Una vez que las páginas estén desplegadas, simplemente actualiza `shared/utils/webUrls.ts` para que `areWebPagesAvailable()` retorne `true` en producción.

## 📱 Funcionamiento en App

### ✅ Lo que funciona:
- Enlaces clickeables están implementados
- Detección automática del idioma del usuario  
- Manejo de errores si las URLs no están disponibles
- UI actualizada con links destacados

### ⏳ Lo que falta:
- Desplegar las páginas web
- Configurar el dominio de producción
- Testing en URLs reales

## 🎨 Características de las Páginas

- **Diseño responsivo** para móvil y desktop
- **Mismo sistema de diseño** que la waiting-list
- **Multi-idioma** (es_ES, en_US)
- **SEO optimizado** con meta tags apropiados
- **Navegación entre idiomas** con botones de cambio
- **Branding consistente** con gradientes y colores de Redbee