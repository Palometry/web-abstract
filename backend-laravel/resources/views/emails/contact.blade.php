<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Nuevo mensaje de contacto</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #1f2937;">
    <h2 style="margin: 0 0 16px;">Nuevo mensaje desde la web</h2>

    <p style="margin: 0 0 8px;"><strong>Nombre:</strong> {{ $contact['fullName'] }}</p>
    <p style="margin: 0 0 8px;"><strong>Correo:</strong> {{ $contact['email'] }}</p>
    <p style="margin: 0 0 16px;"><strong>Celular:</strong> {{ $contact['phone'] }}</p>

    <p style="margin: 0 0 8px;"><strong>Mensaje:</strong></p>
    <div style="padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; white-space: pre-line;">
      {{ $contact['message'] }}
    </div>

    <p style="margin: 16px 0 0;">Puedes responder directamente a este correo para contactar al cliente.</p>
  </body>
</html>
