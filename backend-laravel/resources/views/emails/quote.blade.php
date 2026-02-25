<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Cotización</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #1f2937;">
    <h2 style="margin: 0 0 8px;">Cotización #{{ $quote['id'] }}</h2>
    <p style="margin: 0 0 16px;">Hola {{ $quote['fullName'] }}, adjuntamos tu cotización en PDF.</p>

    <p style="margin: 0 0 6px;"><strong>Proyecto:</strong> {{ $quote['projectName'] }}</p>
    <p style="margin: 0 0 6px;"><strong>Fecha:</strong> {{ $quote['createdAt'] }}</p>
    @if (!empty($quote['expiresAt']))
      <p style="margin: 0 0 16px;"><strong>Vigencia:</strong> {{ $quote['expiresAt'] }}</p>
    @endif

    <p style="margin: 0 0 16px;">Si tienes dudas, responde este correo.</p>

    <p style="margin: 0;">Atentamente,</p>
    <p style="margin: 0;">ArquiNelson</p>
  </body>
</html>
