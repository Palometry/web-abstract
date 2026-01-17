import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

type PricingType = 'flat' | 'per_m2' | 'percent';

type QuoteServiceInput = {
  serviceId?: number;
  quantity?: number;
  unitPrice?: number;
};

type QuoteCreateBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  projectName?: string;
  areaM2?: number;
  baseRatePerM2?: number;
  pricingRateId?: number | null;
  currency?: string;
  status?: string;
  notes?: string | null;
  services?: QuoteServiceInput[];
};

type QuoteUpdateBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  projectName?: string;
  areaM2?: number;
  baseRatePerM2?: number;
  status?: string;
  notes?: string | null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeStatus = (status?: string) => {
  if (!status) {
    return undefined;
  }
  const allowed = new Set(['new', 'reviewed', 'sent', 'accepted', 'rejected']);
  return allowed.has(status) ? status : undefined;
};

const computeLineTotal = (
  pricingType: PricingType,
  unitPrice: number,
  quantity: number,
  areaM2: number,
  baseCost: number
) => {
  const safeQty = quantity > 0 ? quantity : 1;
  const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
  let total = 0;
  switch (pricingType) {
    case 'per_m2':
      total = safePrice * areaM2 * safeQty;
      break;
    case 'percent':
      total = baseCost * (safePrice / 100) * safeQty;
      break;
    default:
      total = safePrice * safeQty;
      break;
  }
  return roundMoney(total);
};

export const quotesRouter = Router();

quotesRouter.use(authenticate);

quotesRouter.get('/options', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rateRows] = await db.query(
    `SELECT id, name, base_price_per_m2, currency, is_active
     FROM pricing_rates
     ORDER BY is_active DESC, effective_from DESC, id DESC`
  );
  const [serviceRows] = await db.query(
    `SELECT id, name, pricing_type, price, currency, is_addon, is_active
     FROM services
     ORDER BY display_order ASC, id ASC`
  );

  const pricingRates = Array.isArray(rateRows)
    ? rateRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        basePricePerM2: Number(row.base_price_per_m2),
        currency: row.currency,
        isActive: !!row.is_active
      }))
    : [];

  const services = Array.isArray(serviceRows)
    ? serviceRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        pricingType: row.pricing_type as PricingType,
        price: Number(row.price),
        currency: row.currency,
        isAddon: !!row.is_addon,
        isActive: !!row.is_active
      }))
    : [];

  return res.json({ pricingRates, services });
});

quotesRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT id, full_name, project_name, area_m2, total_cost, status, currency, created_at
     FROM quotes
     ORDER BY created_at DESC`
  );

  const quotes = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        fullName: row.full_name,
        projectName: row.project_name,
        areaM2: Number(row.area_m2),
        totalCost: Number(row.total_cost),
        status: row.status,
        currency: row.currency,
        createdAt: row.created_at
      }))
    : [];

  return res.json(quotes);
});

quotesRouter.get('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const quoteId = Number(req.params['id']);
  if (!Number.isFinite(quoteId)) {
    return res.status(400).json({ error: 'Invalid quote id.' });
  }

  const [rows] = await db.query(
    `SELECT q.id, q.full_name, q.phone, q.email, q.project_name, q.area_m2,
            q.base_rate_per_m2, q.base_cost, q.extras_cost, q.total_cost,
            q.currency, q.status, q.notes, q.created_at,
            pr.id AS pricing_rate_id, pr.name AS pricing_rate_name
     FROM quotes q
     LEFT JOIN pricing_rates pr ON pr.id = q.pricing_rate_id
     WHERE q.id = ?
     LIMIT 1`,
    [quoteId]
  );

  const quote = Array.isArray(rows) ? rows[0] : undefined;
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found.' });
  }

  const [serviceRows] = await db.query(
    `SELECT qs.id, qs.service_id, s.name, s.pricing_type, qs.quantity, qs.unit_price, qs.line_total
     FROM quote_services qs
     INNER JOIN services s ON s.id = qs.service_id
     WHERE qs.quote_id = ?
     ORDER BY qs.id ASC`,
    [quoteId]
  );

  const services = Array.isArray(serviceRows)
    ? serviceRows.map((row: any) => ({
        id: row.id,
        serviceId: row.service_id,
        name: row.name,
        pricingType: row.pricing_type as PricingType,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        lineTotal: Number(row.line_total)
      }))
    : [];

  return res.json({
    id: quote.id,
    fullName: quote.full_name,
    phone: quote.phone,
    email: quote.email,
    projectName: quote.project_name,
    areaM2: Number(quote.area_m2),
    baseRatePerM2: Number(quote.base_rate_per_m2),
    baseCost: Number(quote.base_cost),
    extrasCost: Number(quote.extras_cost),
    totalCost: Number(quote.total_cost),
    currency: quote.currency,
    status: quote.status,
    notes: quote.notes,
    createdAt: quote.created_at,
    pricingRateId: quote.pricing_rate_id,
    pricingRateName: quote.pricing_rate_name,
    services
  });
});

quotesRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const {
    fullName,
    phone,
    email,
    projectName,
    areaM2,
    baseRatePerM2,
    pricingRateId,
    currency,
    status,
    notes,
    services
  } = req.body as QuoteCreateBody;

  const safeFullName = (fullName ?? '').trim();
  const safePhone = (phone ?? '').trim();
  const safeEmail = (email ?? '').trim();
  const safeProjectName = (projectName ?? '').trim();
  if (!safeFullName || !safePhone || !safeEmail || !safeProjectName) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const parsedArea = toNumber(areaM2, -1);
  if (parsedArea <= 0) {
    return res.status(400).json({ error: 'areaM2 must be greater than 0.' });
  }

  let selectedRateId: number | null = null;
  if (Number.isFinite(pricingRateId)) {
    selectedRateId = Number(pricingRateId);
  }

  let ratePerM2 = toNumber(baseRatePerM2, -1);
  let quoteCurrency = (currency ?? 'PEN').toString().toUpperCase();
  if (selectedRateId) {
    const [rateRows] = await db.query(
      `SELECT id, base_price_per_m2, currency
       FROM pricing_rates
       WHERE id = ? AND is_active = 1
       LIMIT 1`,
      [selectedRateId]
    );
    const rate = Array.isArray(rateRows) ? rateRows[0] : undefined;
    if (!rate) {
      return res.status(400).json({ error: 'Invalid pricing rate.' });
    }
    ratePerM2 = Number(rate.base_price_per_m2);
    quoteCurrency = rate.currency;
  }

  if (ratePerM2 <= 0) {
    return res.status(400).json({ error: 'baseRatePerM2 must be greater than 0.' });
  }

  const baseCost = roundMoney(parsedArea * ratePerM2);
  const safeStatus = sanitizeStatus(status) ?? 'new';
  const safeNotes = typeof notes === 'string' ? notes.trim() || null : null;
  const serviceInputs = Array.isArray(services) ? services : [];
  const serviceIds = Array.from(
    new Set(
      serviceInputs
        .map((item) => Number(item.serviceId))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const serviceMap = new Map<number, { pricingType: PricingType; price: number; isActive: boolean }>();
    if (serviceIds.length) {
      const placeholders = serviceIds.map(() => '?').join(', ');
      const [serviceRows] = await connection.query(
        `SELECT id, pricing_type, price, is_active
         FROM services
         WHERE id IN (${placeholders})`,
        serviceIds
      );
      if (Array.isArray(serviceRows)) {
        serviceRows.forEach((row: any) => {
          serviceMap.set(row.id, {
            pricingType: row.pricing_type as PricingType,
            price: Number(row.price),
            isActive: !!row.is_active
          });
        });
      }
    }

    const lineItems: Array<{
      serviceId: number;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];
    let extrasCost = 0;

    for (const item of serviceInputs) {
      const serviceId = Number(item.serviceId);
      if (!Number.isFinite(serviceId)) {
        continue;
      }
      const service = serviceMap.get(serviceId);
      if (!service || !service.isActive) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid service selection.' });
      }
      const quantity = Math.max(1, toNumber(item.quantity, 1));
      const unitPrice =
        item.unitPrice !== undefined ? toNumber(item.unitPrice, service.price) : service.price;
      const lineTotal = computeLineTotal(
        service.pricingType,
        unitPrice,
        quantity,
        parsedArea,
        baseCost
      );
      lineItems.push({ serviceId, quantity, unitPrice, lineTotal });
      extrasCost += lineTotal;
    }

    extrasCost = roundMoney(extrasCost);
    const totalCost = roundMoney(baseCost + extrasCost);

    const [result] = await connection.query(
      `INSERT INTO quotes (
        pricing_rate_id, full_name, phone, email, project_name,
        area_m2, base_rate_per_m2, base_cost, extras_cost, total_cost,
        currency, status, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        selectedRateId,
        safeFullName,
        safePhone,
        safeEmail,
        safeProjectName,
        parsedArea,
        ratePerM2,
        baseCost,
        extrasCost,
        totalCost,
        quoteCurrency,
        safeStatus,
        safeNotes
      ]
    );

    const quoteId = (result as any).insertId as number;
    for (const line of lineItems) {
      await connection.query(
        `INSERT INTO quote_services (quote_id, service_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [quoteId, line.serviceId, line.quantity, line.unitPrice, line.lineTotal]
      );
    }

    await connection.commit();
    return res.status(201).json({ id: quoteId });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to create quote.' });
  } finally {
    connection.release();
  }
});

quotesRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const quoteId = Number(req.params['id']);
  if (!Number.isFinite(quoteId)) {
    return res.status(400).json({ error: 'Invalid quote id.' });
  }

  const { fullName, phone, email, projectName, areaM2, baseRatePerM2, status, notes } =
    req.body as QuoteUpdateBody;

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (fullName !== undefined) {
    const safeFullName = String(fullName).trim();
    if (!safeFullName) {
      return res.status(400).json({ error: 'fullName cannot be empty.' });
    }
    updates.push('full_name = ?');
    params.push(safeFullName);
  }
  if (phone !== undefined) {
    const safePhone = String(phone).trim();
    if (!safePhone) {
      return res.status(400).json({ error: 'phone cannot be empty.' });
    }
    updates.push('phone = ?');
    params.push(safePhone);
  }
  if (email !== undefined) {
    const safeEmail = String(email).trim();
    if (!safeEmail) {
      return res.status(400).json({ error: 'email cannot be empty.' });
    }
    updates.push('email = ?');
    params.push(safeEmail);
  }
  if (projectName !== undefined) {
    const safeProjectName = String(projectName).trim();
    if (!safeProjectName) {
      return res.status(400).json({ error: 'projectName cannot be empty.' });
    }
    updates.push('project_name = ?');
    params.push(safeProjectName);
  }
  if (status !== undefined) {
    const safeStatus = sanitizeStatus(status);
    if (!safeStatus) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.push('status = ?');
    params.push(safeStatus);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(typeof notes === 'string' ? notes.trim() || null : null);
  }

  let recalcTotals = false;
  const parsedArea = areaM2 !== undefined ? toNumber(areaM2, -1) : undefined;
  const parsedRate = baseRatePerM2 !== undefined ? toNumber(baseRatePerM2, -1) : undefined;
  if (parsedArea !== undefined) {
    if (parsedArea <= 0) {
      return res.status(400).json({ error: 'areaM2 must be greater than 0.' });
    }
    recalcTotals = true;
  }
  if (parsedRate !== undefined) {
    if (parsedRate <= 0) {
      return res.status(400).json({ error: 'baseRatePerM2 must be greater than 0.' });
    }
    recalcTotals = true;
  }

  if (!updates.length && !recalcTotals) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [quoteRows] = await connection.query(
      `SELECT id, area_m2, base_rate_per_m2, base_cost
       FROM quotes
       WHERE id = ?
       LIMIT 1`,
      [quoteId]
    );
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : undefined;
    if (!quote) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const finalArea = parsedArea ?? Number(quote.area_m2);
    const finalRate = parsedRate ?? Number(quote.base_rate_per_m2);
    let baseCost = Number(quote.base_cost);

    if (recalcTotals) {
      baseCost = roundMoney(finalArea * finalRate);
      updates.push('area_m2 = ?');
      params.push(finalArea);
      updates.push('base_rate_per_m2 = ?');
      params.push(finalRate);
      updates.push('base_cost = ?');
      params.push(baseCost);
    }

    if (updates.length) {
      await connection.query(`UPDATE quotes SET ${updates.join(', ')} WHERE id = ?`, [
        ...params,
        quoteId
      ]);
    }

    if (recalcTotals) {
      const [lineRows] = await connection.query(
        `SELECT qs.id, qs.quantity, qs.unit_price, s.pricing_type
         FROM quote_services qs
         INNER JOIN services s ON s.id = qs.service_id
         WHERE qs.quote_id = ?`,
        [quoteId]
      );

      let extrasCost = 0;
      if (Array.isArray(lineRows)) {
        for (const row of lineRows) {
          const lineTotal = computeLineTotal(
            row.pricing_type as PricingType,
            Number(row.unit_price),
            Number(row.quantity),
            finalArea,
            baseCost
          );
          extrasCost += lineTotal;
          await connection.query('UPDATE quote_services SET line_total = ? WHERE id = ?', [
            lineTotal,
            row.id
          ]);
        }
      }

      extrasCost = roundMoney(extrasCost);
      const totalCost = roundMoney(baseCost + extrasCost);
      await connection.query(
        'UPDATE quotes SET extras_cost = ?, total_cost = ? WHERE id = ?',
        [extrasCost, totalCost, quoteId]
      );
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to update quote.' });
  } finally {
    connection.release();
  }
});

quotesRouter.post('/:id/services', requireRole(['admin', 'editor']), async (req, res) => {
  const quoteId = Number(req.params['id']);
  if (!Number.isFinite(quoteId)) {
    return res.status(400).json({ error: 'Invalid quote id.' });
  }

  const { serviceId, quantity, unitPrice } = req.body as QuoteServiceInput;
  const parsedServiceId = Number(serviceId);
  if (!Number.isFinite(parsedServiceId)) {
    return res.status(400).json({ error: 'serviceId is required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [quoteRows] = await connection.query(
      `SELECT id, area_m2, base_cost
       FROM quotes
       WHERE id = ?
       LIMIT 1`,
      [quoteId]
    );
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : undefined;
    if (!quote) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const [serviceRows] = await connection.query(
      `SELECT id, pricing_type, price, is_active
       FROM services
       WHERE id = ?
       LIMIT 1`,
      [parsedServiceId]
    );
    const service = Array.isArray(serviceRows) ? serviceRows[0] : undefined;
    if (!service || !service.is_active) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid service selection.' });
    }

    const safeQuantity = Math.max(1, toNumber(quantity, 1));
    const safeUnitPrice =
      unitPrice !== undefined ? toNumber(unitPrice, Number(service.price)) : Number(service.price);
    const baseCost = Number(quote.base_cost);
    const areaM2 = Number(quote.area_m2);
    const lineTotal = computeLineTotal(
      service.pricing_type as PricingType,
      safeUnitPrice,
      safeQuantity,
      areaM2,
      baseCost
    );

    const [result] = await connection.query(
      `INSERT INTO quote_services (quote_id, service_id, quantity, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?)`,
      [quoteId, parsedServiceId, safeQuantity, safeUnitPrice, lineTotal]
    );

    const [sumRows] = await connection.query(
      `SELECT COALESCE(SUM(line_total), 0) AS extras_cost
       FROM quote_services
       WHERE quote_id = ?`,
      [quoteId]
    );
    const extrasCost = Array.isArray(sumRows) ? Number(sumRows[0]?.extras_cost ?? 0) : 0;
    const totalCost = roundMoney(baseCost + extrasCost);
    await connection.query(
      `UPDATE quotes SET extras_cost = ?, total_cost = ? WHERE id = ?`,
      [extrasCost, totalCost, quoteId]
    );

    await connection.commit();
    return res.status(201).json({ id: (result as any).insertId });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to add service.' });
  } finally {
    connection.release();
  }
});

quotesRouter.patch('/:id/services/:serviceId', requireRole(['admin', 'editor']), async (req, res) => {
  const quoteId = Number(req.params['id']);
  const quoteServiceId = Number(req.params['serviceId']);
  if (!Number.isFinite(quoteId) || !Number.isFinite(quoteServiceId)) {
    return res.status(400).json({ error: 'Invalid ids.' });
  }

  const { quantity, unitPrice } = req.body as QuoteServiceInput;
  if (quantity === undefined && unitPrice === undefined) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [quoteRows] = await connection.query(
      `SELECT id, area_m2, base_cost
       FROM quotes
       WHERE id = ?
       LIMIT 1`,
      [quoteId]
    );
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : undefined;
    if (!quote) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const [lineRows] = await connection.query(
      `SELECT qs.id, qs.quantity, qs.unit_price, s.pricing_type
       FROM quote_services qs
       INNER JOIN services s ON s.id = qs.service_id
       WHERE qs.id = ? AND qs.quote_id = ?
       LIMIT 1`,
      [quoteServiceId, quoteId]
    );
    const line = Array.isArray(lineRows) ? lineRows[0] : undefined;
    if (!line) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote service not found.' });
    }

    const safeQuantity =
      quantity !== undefined ? Math.max(1, toNumber(quantity, 1)) : Number(line.quantity);
    const safeUnitPrice =
      unitPrice !== undefined ? toNumber(unitPrice, Number(line.unit_price)) : Number(line.unit_price);

    const lineTotal = computeLineTotal(
      line.pricing_type as PricingType,
      safeUnitPrice,
      safeQuantity,
      Number(quote.area_m2),
      Number(quote.base_cost)
    );

    await connection.query(
      `UPDATE quote_services SET quantity = ?, unit_price = ?, line_total = ? WHERE id = ?`,
      [safeQuantity, safeUnitPrice, lineTotal, quoteServiceId]
    );

    const [sumRows] = await connection.query(
      `SELECT COALESCE(SUM(line_total), 0) AS extras_cost
       FROM quote_services
       WHERE quote_id = ?`,
      [quoteId]
    );
    const extrasCost = Array.isArray(sumRows) ? Number(sumRows[0]?.extras_cost ?? 0) : 0;
    const totalCost = roundMoney(Number(quote.base_cost) + extrasCost);
    await connection.query(
      `UPDATE quotes SET extras_cost = ?, total_cost = ? WHERE id = ?`,
      [extrasCost, totalCost, quoteId]
    );

    await connection.commit();
    return res.json({ ok: true });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to update service.' });
  } finally {
    connection.release();
  }
});

quotesRouter.delete('/:id/services/:serviceId', requireRole(['admin', 'editor']), async (req, res) => {
  const quoteId = Number(req.params['id']);
  const quoteServiceId = Number(req.params['serviceId']);
  if (!Number.isFinite(quoteId) || !Number.isFinite(quoteServiceId)) {
    return res.status(400).json({ error: 'Invalid ids.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [quoteRows] = await connection.query(
      `SELECT id, base_cost
       FROM quotes
       WHERE id = ?
       LIMIT 1`,
      [quoteId]
    );
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : undefined;
    if (!quote) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const [result] = await connection.query(
      `DELETE FROM quote_services WHERE id = ? AND quote_id = ?`,
      [quoteServiceId, quoteId]
    );
    if ((result as any).affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Quote service not found.' });
    }

    const [sumRows] = await connection.query(
      `SELECT COALESCE(SUM(line_total), 0) AS extras_cost
       FROM quote_services
       WHERE quote_id = ?`,
      [quoteId]
    );
    const extrasCost = Array.isArray(sumRows) ? Number(sumRows[0]?.extras_cost ?? 0) : 0;
    const totalCost = roundMoney(Number(quote.base_cost) + extrasCost);
    await connection.query(
      `UPDATE quotes SET extras_cost = ?, total_cost = ? WHERE id = ?`,
      [extrasCost, totalCost, quoteId]
    );

    await connection.commit();
    return res.status(204).send();
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to delete service.' });
  } finally {
    connection.release();
  }
});
