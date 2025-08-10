# ✅ Configuración de Templates de Email con Idiomas en Supabase

## Resumen de Cambios Realizados en el Código

### 1. Método `signUpWithEmail` Modificado
- **Parámetro añadido**: `language?: string` - Idioma del dispositivo
- **Metadata incluida**: Se envía el idioma en `options.data.language`
- **Redirect URL**: `emailRedirectTo: 'redbeeapp://auth/confirm-email'`
- **Perfil actualizado**: Se guarda el idioma en la tabla `profiles`

### 2. Método `resetPassword` Modificado  
- **Obtención automática del idioma**: Busca el idioma del usuario en la tabla `users_with_email`
- **Fallback**: Si no encuentra el idioma del usuario, usa el idioma del dispositivo
- **Actualización de metadatos**: Guarda temporalmente el idioma en `user_metadata.email_language`
- **Nota**: Se usa admin API para actualizar metadatos antes del envío del email

### 3. Store `authStore` Actualizado
- **Método `signUp`**: Ahora obtiene el idioma del dispositivo y lo pasa al método `signUpWithEmail`

## Configuración Necesaria en Supabase Dashboard

### 1. Crear Vista `users_with_email`
Primero necesitas crear una vista en tu base de datos que permita obtener el idioma del usuario por email:

```sql
-- Vista para obtener idioma del usuario por email
CREATE OR REPLACE VIEW users_with_email AS
SELECT 
  au.id,
  au.email,
  p.language
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- Asegúrate de que RLS está configurado correctamente
ALTER VIEW users_with_email ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura del idioma y id para reset password
CREATE POLICY "Allow reading user language for password reset" 
ON users_with_email FOR SELECT 
USING (true); -- Ajusta según tus necesidades de seguridad
```

**Nota**: Esta vista incluye el `id` del usuario que es necesario para actualizar los metadatos antes del envío del email.

### 2. Acceder a Templates de Email
1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Authentication** → **Email Templates**

### 3. Template de Confirmación de Email (Sign Up)
Este template se ejecuta cuando un usuario se registra.

**Ubicación**: `Authentication > Email Templates > Confirm signup`

**Variables disponibles en el template**:
- `{{ .Email }}` - Email del usuario
- `{{ .Token }}` - Token de confirmación  
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL base del sitio
- `{{ .ConfirmationURL }}` - URL completa de confirmación
- `{{ .Data.language }}` - **NUEVO**: Idioma del dispositivo
- `{{ .Data.display_name }}` - Nombre a mostrar
- `{{ .Data.username }}` - Username del usuario

**Template HTML con soporte multiidioma**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>
    {{if eq .Data.email_language "es_ES"}}
      Confirma tu cuenta en Redbee
    {{else if eq .Data.email_language "ca_ES"}}  
      Confirma el teu compte a Redbee
    {{else}}
      Confirm your Redbee account
    {{end}}
  </title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .logo { width: 80px; height: 80px; margin-bottom: 20px; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f8f9fa; }
    .link { word-break: break-all; color: #007bff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://redbeeapp.com/logo.png" alt="Redbee" class="logo">
      <h1>
        {{if eq .Data.email_language "es_ES"}}
          ¡Bienvenido a Redbee!
        {{else if eq .Data.email_language "ca_ES"}}
          Benvingut a Redbee!
        {{else}}
          Welcome to Redbee!
        {{end}}
      </h1>
    </div>
    
    <div class="content">
      <h2 style="color: #333; margin-top: 0;">
        {{if eq .Data.email_language "es_ES"}}
          Hola {{ .Data.display_name }},
        {{else if eq .Data.email_language "ca_ES"}}
          Hola {{ .Data.display_name }},
        {{else}}
          Hi {{ .Data.display_name }},
        {{end}}
      </h2>
      
      <p style="color: #666; line-height: 1.6; font-size: 16px;">
        {{if eq .Data.email_language "es_ES"}}
          Gracias por registrarte en Redbee. Para completar tu registro y verificar tu cuenta, haz clic en el botón de abajo:
        {{else if eq .Data.email_language "ca_ES"}}
          Gràcies per registrar-te a Redbee. Per completar el teu registre i verificar el teu compte, fes clic al botó de sota:
        {{else}}
          Thanks for signing up to Redbee. To complete your registration and verify your account, click the button below:
        {{end}}
      </p>
      
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">
          {{if eq .Data.email_language "es_ES"}}
            Confirmar mi cuenta
          {{else if eq .Data.email_language "ca_ES"}}
            Confirmar el meu compte
          {{else}}
            Confirm my account
          {{end}}
        </a>
      </div>
      
      <p style="color: #888; font-size: 14px; margin-top: 30px;">
        {{if eq .Data.email_language "es_ES"}}
          Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
        {{else if eq .Data.email_language "ca_ES"}}
          Si no pots fer clic al botó, copia i enganxa aquest enllaç al teu navegador:
        {{else}}
          If you can't click the button, copy and paste this link in your browser:
        {{end}}
        <br><br>
        <span class="link">{{ .ConfirmationURL }}</span>
      </p>
    </div>
    
    <div class="footer">
      <p>
        {{if eq .Data.email_language "es_ES"}}
          Si no solicitaste esta cuenta, puedes ignorar este email de forma segura.
        {{else if eq .Data.email_language "ca_ES"}}
          Si no vas sol·licitar aquest compte, pots ignorar aquest email de forma segura.
        {{else}}
          If you didn't request this account, you can safely ignore this email.
        {{end}}
      </p>
      <p>© 2024 Redbee. {{if eq .Data.email_language "es_ES"}}Todos los derechos reservados.{{else if eq .Data.email_language "ca_ES"}}Tots els drets reservats.{{else}}All rights reserved.{{end}}</p>
    </div>
  </div>
</body>
</html>
```

### 4. Template de Reset Password
Este template se ejecuta cuando un usuario solicita restablecer su contraseña.

**Ubicación**: `Authentication > Email Templates > Reset password`

**Variables disponibles en el template**:
- `{{ .Email }}` - Email del usuario
- `{{ .Token }}` - Token de reset
- `{{ .TokenHash }}` - Hash del token  
- `{{ .SiteURL }}` - URL base del sitio
- `{{ .ConfirmationURL }}` - URL completa de reset
- `{{ .Data.email_language }}` - **NUEVO**: Idioma del usuario (guardado temporalmente en user_metadata)

**Template HTML con soporte multiidioma**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>
    {{if eq .Data.email_language "es_ES"}}
      Restablece tu contraseña - Redbee
    {{else if eq .Data.email_language "ca_ES"}}
      Restableix la teva contrasenya - Redbee
    {{else}}
      Reset your password - Redbee
    {{end}}
  </title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); }
    .logo { width: 80px; height: 80px; margin-bottom: 20px; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { padding: 30px; text-align: center; color: #666; font-size: 14px; background: #f8f9fa; }
    .link { word-break: break-all; color: #dc3545; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://redbeeapp.com/logo.png" alt="Redbee" class="logo">
      <h1>Redbee</h1>
    </div>
    
    <div class="content">
      <h2 style="color: #333; margin-top: 0;">
        {{if eq .Data.email_language "es_ES"}}
          Restablecimiento de contraseña
        {{else if eq .Data.email_language "ca_ES"}}
          Restabliment de contrasenya
        {{else}}
          Password Reset
        {{end}}
      </h2>
      
      <p style="color: #666; line-height: 1.6; font-size: 16px;">
        {{if eq .Data.email_language "es_ES"}}
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Redbee ({{ .Email }}).
        {{else if eq .Data.email_language "ca_ES"}}
          Hem rebut una sol·licitud per restablir la contrasenya del teu compte a Redbee ({{ .Email }}).
        {{else}}
          We received a request to reset the password for your Redbee account ({{ .Email }}).
        {{end}}
      </p>
      
      <p style="color: #666; line-height: 1.6; font-size: 16px;">
        {{if eq .Data.email_language "es_ES"}}
          Haz clic en el botón de abajo para crear una nueva contraseña:
        {{else if eq .Data.email_language "ca_ES"}}
          Fes clic al botó de sota per crear una nova contrasenya:
        {{else}}
          Click the button below to create a new password:
        {{end}}
      </p>
      
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">
          {{if eq .Data.email_language "es_ES"}}
            Restablecer mi contraseña
          {{else if eq .Data.email_language "ca_ES"}}
            Restablir la meva contrasenya
          {{else}}
            Reset my password
          {{end}}
        </a>
      </div>
      
      <div class="warning">
        <p style="color: #856404; margin: 0; font-size: 14px;">
          {{if eq .Data.email_language "es_ES"}}
            ⚠️ <strong>Importante:</strong> Este enlace expirará en 60 minutos por seguridad.
          {{else if eq .Data.email_language "ca_ES"}}
            ⚠️ <strong>Important:</strong> Aquest enllaç expirarà en 60 minuts per seguretat.
          {{else}}
            ⚠️ <strong>Important:</strong> This link will expire in 60 minutes for security.
          {{end}}
        </p>
      </div>
      
      <p style="color: #888; font-size: 14px; margin-top: 30px;">
        {{if eq .Data.email_language "es_ES"}}
          Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
        {{else if eq .Data.email_language "ca_ES"}}
          Si no pots fer clic al botó, copia i enganxa aquest enllaç al teu navegador:
        {{else}}
          If you can't click the button, copy and paste this link in your browser:
        {{end}}
        <br><br>
        <span class="link">{{ .ConfirmationURL }}</span>
      </p>
    </div>
    
    <div class="footer">
      <p>
        {{if eq .Data.email_language "es_ES"}}
          Si no solicitaste este restablecimiento, puedes ignorar este email. Tu contraseña no será cambiada.
        {{else if eq .Data.email_language "ca_ES"}}
          Si no vas sol·licitar aquest restabliment, pots ignorar aquest email. La teva contrasenya no es canviarà.
        {{else}}
          If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
        {{end}}
      </p>
      <p>© 2024 Redbee. {{if eq .Data.email_language "es_ES"}}Todos los derechos reservados.{{else if eq .Data.email_language "ca_ES"}}Tots els drets reservats.{{else}}All rights reserved.{{end}}</p>
    </div>
  </div>
</body>
</html>
```

### 5. Configuración de Site URL y Redirect URLs
En **Authentication > URL Configuration**, configura:
- **Site URL**: `https://redbeeapp.com`
- **Redirect URLs**: 
  - `redbeeapp://auth/confirm-email`
  - `redbeeapp://auth/confirm-password`
  - `https://redbeeapp.com/auth/callback` (para web, si es necesario)

## Flujo Completo Implementado

### ✅ Registro (Sign Up):
1. Usuario se registra desde la app
2. Se detecta idioma del dispositivo (`getDeviceLanguage()`)
3. Se envía idioma en metadata (`options.data.language`)
4. Se guarda idioma en el perfil del usuario
5. Supabase usa el template con el idioma correcto
6. Usuario recibe email de confirmación en su idioma

### ✅ Reset Password:
1. Usuario solicita reset desde la app
2. Se busca el idioma del usuario en la BD por email usando vista `users_with_email`
3. Si no se encuentra, se usa idioma del dispositivo como fallback
4. Se envía idioma en metadata (`options.data.language`) 
5. Supabase usa el template con el idioma del usuario
6. Usuario recibe email de reset en su idioma configurado

## Idiomas Soportados
- `es_ES` - Español (España)
- `ca_ES` - Catalán (España)  
- `en_US` - Inglés (Estados Unidos) - **fallback por defecto**

## Testing y Verificación
Para probar los templates:

1. **Test Sign Up multiidioma:**
   ```bash
   # Cambia el idioma del dispositivo/simulador
   # Registra usuarios con diferentes idiomas
   # Verifica que los emails lleguen en el idioma correcto
   ```

2. **Test Reset Password:**
   ```bash
   # Crea usuarios con diferentes idiomas en sus perfiles
   # Solicita reset password para cada usuario
   # Verifica que usa el idioma del perfil del usuario
   ```

3. **Test Fallbacks:**
   ```bash
   # Usuarios sin idioma configurado deben recibir emails en español (fallback)
   # Si falla la consulta de idioma, debe usar idioma del dispositivo
   ```

## ⚠️ Notas Importantes

1. **Vista `users_with_email`**: Debe ser creada antes de usar reset password
2. **RLS**: Configura las políticas de Row Level Security según tus necesidades
3. **Admin API**: El código usa `supabase.auth.admin.getUserByEmail()` que requiere service role key
4. **Service Role Key**: Asegúrate de que tu cliente Supabase use la service role key para operaciones admin
5. **Dominio**: Cambia `https://redbeeapp.com` por tu dominio real
6. **Logo**: Actualiza las URLs del logo en los templates
7. **Estilos**: Los templates incluyen CSS inline para máxima compatibilidad con clientes de email

### ⚠️ Configuración de Service Role Key
Para que funcione el reset password con idiomas, tu cliente de Supabase debe estar configurado con la service role key:

```typescript
// En tu archivo de configuración de Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseServiceRoleKey = 'YOUR_SERVICE_ROLE_KEY' // No la anon key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
```

**IMPORTANTE**: La service role key debe mantenerse en secreto y solo usarse del lado del servidor o en aplicaciones móviles seguras.

## 🔧 Archivos Modificados
- ✅ `/services/supabaseAuth.ts` - Métodos `signUpWithEmail` y `resetPassword`
- ✅ `/stores/authStore.ts` - Método `signUp` actualizado
- ✅ Templates de email en Supabase Dashboard (configuración manual)
- ✅ Vista `users_with_email` en base de datos (SQL a ejecutar)