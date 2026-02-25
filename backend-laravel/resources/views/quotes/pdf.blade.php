<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Cotización #{{ $quote['id'] }}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: DejaVu Sans, Arial, sans-serif; color: #111827; font-size: 12px; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      h2 { font-size: 14px; margin: 0 0 8px; }
      .muted { color: #6b7280; }
      .row { display: flex; justify-content: space-between; }
      .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-bottom: 12px; }
      .grid { width: 100%; border-collapse: collapse; }
      .grid th, .grid td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      .grid th { background: #f9fafb; }
      .right { text-align: right; }
      .summary { display: flex; gap: 12px; }
      .summary .box { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
      .footer { margin-top: 16px; font-size: 11px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="row">
      <div>
        <h1>Cotización #{{ $quote['id'] }}</h1>
        <div class="muted">ArquiNelson</div>
      </div>
      <div class="muted" style="text-align: right;">
        <div>Fecha: {{ $quote['createdAt'] }}</div>
        @if (!empty($quote['expiresAt']))
          <div>Vigencia: {{ $quote['expiresAt'] }}</div>
        @endif
      </div>
    </div>

    <div class="card">
      <h2>Datos del cliente</h2>
      <div><strong>Nombre:</strong> {{ $quote['fullName'] }}</div>
      <div><strong>Correo:</strong> {{ $quote['email'] }}</div>
      <div><strong>Teléfono:</strong> {{ $quote['phone'] }}</div>
      @if (!empty($quote['documentNumber']))
        <div><strong>Documento:</strong> {{ $quote['documentType'] }} {{ $quote['documentNumber'] }}</div>
      @endif
    </div>

    <div class="card">
      <h2>Datos del proyecto</h2>
      <div><strong>Proyecto:</strong> {{ $quote['projectName'] }}</div>
      @if (!empty($quote['projectAddress']))
        <div><strong>Dirección:</strong> {{ $quote['projectAddress'] }}</div>
      @endif
      <div><strong>Área total:</strong> {{ $quote['areaM2'] }} m²</div>
      <div><strong>Área techada:</strong> {{ $quote['areaCoveredM2'] }} m²</div>
      <div><strong>Área libre:</strong> {{ $quote['areaUncoveredM2'] }} m² ({{ $quote['areaUncoveredPercent'] }}%)</div>
      <div><strong>Pisos:</strong> {{ $quote['floorCount'] }}</div>
      @if (!empty($quote['planName']))
        <div><strong>Plan:</strong> {{ $quote['planName'] }}</div>
      @endif
    </div>

    <div class="card">
      <h2>Resumen de costos</h2>
      <div class="summary">
        <div class="box">
          <div class="muted">Base</div>
          <div><strong>{{ $quote['currencySymbol'] }} {{ number_format($quote['baseCost'], 2) }}</strong></div>
        </div>
        <div class="box">
          <div class="muted">Extras</div>
          <div><strong>{{ $quote['currencySymbol'] }} {{ number_format($quote['extrasCost'], 2) }}</strong></div>
        </div>
        <div class="box">
          <div class="muted">Total</div>
          <div><strong>{{ $quote['currencySymbol'] }} {{ number_format($quote['totalCost'], 2) }}</strong></div>
        </div>
      </div>
    </div>

    @if (!empty($services))
      <div class="card">
        <h2>Servicios adicionales</h2>
        <table class="grid">
          <thead>
            <tr>
              <th>Servicio</th>
              <th class="right">Cantidad</th>
              <th class="right">Precio</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            @foreach ($services as $service)
              <tr>
                <td>{{ $service['name'] }}</td>
                <td class="right">{{ $service['quantity'] }}</td>
                <td class="right">{{ $quote['currencySymbol'] }} {{ number_format($service['unitPrice'], 2) }}</td>
                <td class="right">{{ $quote['currencySymbol'] }} {{ number_format($service['lineTotal'], 2) }}</td>
              </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    @endif

    @if (!empty($quote['notes']))
      <div class="card">
        <h2>Notas</h2>
        <div>{{ $quote['notes'] }}</div>
      </div>
    @endif

    <div class="footer">
      Esta cotización es referencial y puede variar según especificaciones finales del proyecto.
    </div>
  </body>
</html>
