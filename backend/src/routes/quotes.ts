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
  documentType?: string;
  documentNumber?: string;
  projectName?: string;
  projectAddress?: string;
  areaM2?: number;
  areaCoveredM2?: number;
  areaUncoveredPercent?: number;
  floorCount?: number;
  baseRatePerM2?: number;
  pricingRateId?: number | null;
  currency?: string;
  planName?: string;
  planMinDays?: number;
  planMaxDays?: number;
  status?: string;
  expiresAt?: string | null;
  notes?: string | null;
  services?: QuoteServiceInput[];
};

type QuoteUpdateBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  projectName?: string;
  projectAddress?: string;
  areaM2?: number;
  areaCoveredM2?: number;
  areaUncoveredPercent?: number;
  floorCount?: number;
  baseRatePerM2?: number;
  pricingRateId?: number | null;
  currency?: string;
  planName?: string;
  planMinDays?: number;
  planMaxDays?: number;
  status?: string;
  expiresAt?: string | null;
  notes?: string | null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDate = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return null;
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
    `SELECT id, name, base_price_per_m2, currency, is_active, min_days, max_days
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
        minDays: row.min_days !== null ? Number(row.min_days) : null,
        maxDays: row.max_days !== null ? Number(row.max_days) : null,
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
    `SELECT q.id, q.full_name, q.phone, q.email, q.document_type, q.document_number,
            q.project_name, q.project_address, q.area_m2, q.area_covered_m2,
            q.area_uncovered_percent, q.floor_count, q.expires_at,
            q.base_rate_per_m2, q.base_cost, q.extras_cost, q.total_cost,
            q.currency, q.status, q.notes, q.created_at,
            q.plan_name, q.plan_min_days, q.plan_max_days,
            pr.id AS pricing_rate_id, pr.name AS pricing_rate_name,
            pr.min_days AS pricing_rate_min_days, pr.max_days AS pricing_rate_max_days
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
    documentType: quote.document_type,
    documentNumber: quote.document_number,
    projectName: quote.project_name,
    projectAddress: quote.project_address,
    areaM2: Number(quote.area_m2),
    areaCoveredM2: quote.area_covered_m2 !== null ? Number(quote.area_covered_m2) : null,
    areaUncoveredPercent:
      quote.area_uncovered_percent !== null ? Number(quote.area_uncovered_percent) : null,
    floorCount: quote.floor_count !== null ? Number(quote.floor_count) : null,
    baseRatePerM2: Number(quote.base_rate_per_m2),
    baseCost: Number(quote.base_cost),
    extrasCost: Number(quote.extras_cost),
    totalCost: Number(quote.total_cost),
    currency: quote.currency,
    status: quote.status,
    notes: quote.notes,
    createdAt: quote.created_at,
    expiresAt: formatDate(quote.expires_at),
    pricingRateId: quote.pricing_rate_id,
    pricingRateName: quote.pricing_rate_name,
    planName: quote.plan_name ?? quote.pricing_rate_name,
    planMinDays:
      quote.plan_min_days !== null ? Number(quote.plan_min_days) : Number(quote.pricing_rate_min_days ?? 0) || null,
    planMaxDays:
      quote.plan_max_days !== null ? Number(quote.plan_max_days) : Number(quote.pricing_rate_max_days ?? 0) || null,
    services
  });
});

quotesRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const {
    fullName,
    phone,
    email,
    documentType,
    documentNumber,
    projectName,
    projectAddress,
    areaM2,
    areaCoveredM2,
    areaUncoveredPercent,
    floorCount,
    baseRatePerM2,
    pricingRateId,
    currency,
    planName,
    planMinDays,
    planMaxDays,
    status,
    expiresAt,
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

  const parsedUncovered = toNumber(areaUncoveredPercent, 30);
  const safeUncoveredPercent =
    Number.isFinite(parsedUncovered) && parsedUncovered >= 0 && parsedUncovered <= 100
      ? parsedUncovered
      : 30;
  const safeCoveredM2 = roundMoney(parsedArea * (1 - safeUncoveredPercent / 100));

  const parsedFloors = toNumber(floorCount, -1);
  const safeFloors = Number.isFinite(parsedFloors) && parsedFloors > 0 ? Math.round(parsedFloors) : 1;

  let selectedRateId: number | null = null;
  if (Number.isFinite(pricingRateId)) {
    selectedRateId = Number(pricingRateId);
  }

  let ratePerM2 = toNumber(baseRatePerM2, -1);
  let quoteCurrency = (currency ?? 'PEN').toString().toUpperCase();
  let resolvedPlanName = typeof planName === 'string' ? planName.trim() : '';
  let resolvedPlanMin = Number.isFinite(Number(planMinDays)) ? Number(planMinDays) : null;
  let resolvedPlanMax = Number.isFinite(Number(planMaxDays)) ? Number(planMaxDays) : null;
  if (selectedRateId) {
    const [rateRows] = await db.query(
      `SELECT id, name, base_price_per_m2, currency, min_days, max_days
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
    resolvedPlanName = rate.name;
    resolvedPlanMin = rate.min_days !== null ? Number(rate.min_days) : null;
    resolvedPlanMax = rate.max_days !== null ? Number(rate.max_days) : null;
  }

  if (ratePerM2 <= 0) {
    return res.status(400).json({ error: 'baseRatePerM2 must be greater than 0.' });
  }

  const baseCost = roundMoney(safeCoveredM2 * safeFloors * ratePerM2);
  const safeStatus = sanitizeStatus(status) ?? 'new';
  const safeNotes = typeof notes === 'string' ? notes.trim() || null : null;
  const safeDocumentType = typeof documentType === 'string' ? documentType.trim() || null : null;
  const safeDocumentNumber =
    typeof documentNumber === 'string' ? documentNumber.trim() || null : null;
  const safeProjectAddress =
    typeof projectAddress === 'string' ? projectAddress.trim() || null : null;
  const safeExpiresAt = parseDate(expiresAt ?? undefined);
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
        pricing_rate_id, full_name, phone, email, document_type, document_number,
        project_name, project_address, area_m2, area_covered_m2, area_uncovered_percent,
        floor_count, base_rate_per_m2, base_cost, extras_cost, total_cost,
        currency, status, notes, expires_at, plan_name, plan_min_days, plan_max_days
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        selectedRateId,
        safeFullName,
        safePhone,
        safeEmail,
        safeDocumentType,
        safeDocumentNumber,
        safeProjectName,
        safeProjectAddress,
        parsedArea,
        safeCoveredM2,
        safeUncoveredPercent,
        safeFloors,
        ratePerM2,
        baseCost,
        extrasCost,
        totalCost,
        quoteCurrency,
        safeStatus,
        safeNotes,
        safeExpiresAt,
        resolvedPlanName || null,
        resolvedPlanMin,
        resolvedPlanMax
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
  const {
    documentType,
    documentNumber,
    projectAddress,
    areaCoveredM2,
    areaUncoveredPercent,
    floorCount,
    pricingRateId,
    currency,
    planName,
    planMinDays,
    planMaxDays,
    expiresAt
  } = req.body as QuoteUpdateBody;

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
  if (projectAddress !== undefined) {
    const safeProjectAddress = String(projectAddress).trim();
    updates.push('project_address = ?');
    params.push(safeProjectAddress || null);
  }
  if (documentType !== undefined) {
    const safeDocumentType = String(documentType).trim();
    updates.push('document_type = ?');
    params.push(safeDocumentType || null);
  }
  if (documentNumber !== undefined) {
    const safeDocumentNumber = String(documentNumber).trim();
    updates.push('document_number = ?');
    params.push(safeDocumentNumber || null);
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
  if (expiresAt !== undefined) {
    updates.push('expires_at = ?');
    params.push(parseDate(expiresAt ?? undefined));
  }

  const parsedUncovered =
    areaUncoveredPercent !== undefined ? toNumber(areaUncoveredPercent, -1) : undefined;
  if (parsedUncovered !== undefined) {
    if (parsedUncovered < 0 || parsedUncovered > 100) {
      return res.status(400).json({ error: 'areaUncoveredPercent must be between 0 and 100.' });
    }
    updates.push('area_uncovered_percent = ?');
    params.push(parsedUncovered);
  }

  const parsedCovered = areaCoveredM2 !== undefined ? toNumber(areaCoveredM2, -1) : undefined;
  if (parsedCovered !== undefined) {
    if (parsedCovered < 0) {
      return res.status(400).json({ error: 'areaCoveredM2 must be 0 or greater.' });
    }
    updates.push('area_covered_m2 = ?');
    params.push(parsedCovered);
  }

  const parsedFloors = floorCount !== undefined ? toNumber(floorCount, -1) : undefined;
  if (parsedFloors !== undefined) {
    if (parsedFloors < 1) {
      return res.status(400).json({ error: 'floorCount must be 1 or greater.' });
    }
    updates.push('floor_count = ?');
    params.push(Math.round(parsedFloors));
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
  if (parsedUncovered !== undefined || parsedCovered !== undefined || parsedFloors !== undefined) {
    recalcTotals = true;
  }

  if (!updates.length && !recalcTotals) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [quoteRows] = await connection.query(
      `SELECT id, area_m2, area_covered_m2, area_uncovered_percent, floor_count,
              base_rate_per_m2, base_cost, pricing_rate_id
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

    const existingArea = Number(quote.area_m2);
    const existingUncovered =
      quote.area_uncovered_percent !== null ? Number(quote.area_uncovered_percent) : 30;
    const existingCovered =
      quote.area_covered_m2 !== null
        ? Number(quote.area_covered_m2)
        : roundMoney(existingArea * (1 - existingUncovered / 100));
    const existingFloors = quote.floor_count !== null ? Number(quote.floor_count) : 1;

    let finalArea = parsedArea ?? existingArea;
    let finalRate = parsedRate ?? Number(quote.base_rate_per_m2);
    let finalUncovered = parsedUncovered ?? existingUncovered ?? 30;
    let finalCovered =
      parsedCovered ?? roundMoney(finalArea * (1 - finalUncovered / 100));
    let finalFloors =
      parsedFloors !== undefined ? Math.max(1, Math.round(parsedFloors)) : existingFloors;
    let baseCost = Number(quote.base_cost);
    let finalCurrency = currency ? String(currency).toUpperCase() : undefined;
    const canApplyPlanFields = pricingRateId === undefined || pricingRateId === null;

    if (pricingRateId !== undefined) {
      if (pricingRateId === null) {
        updates.push('pricing_rate_id = ?');
        params.push(null);
      } else if (Number.isFinite(Number(pricingRateId))) {
        const [rateRows] = await connection.query(
          `SELECT id, name, base_price_per_m2, currency, min_days, max_days
           FROM pricing_rates
           WHERE id = ? AND is_active = 1
           LIMIT 1`,
          [Number(pricingRateId)]
        );
        const rate = Array.isArray(rateRows) ? rateRows[0] : undefined;
        if (!rate) {
          await connection.rollback();
          return res.status(400).json({ error: 'Invalid pricing rate.' });
        }
        updates.push('pricing_rate_id = ?');
        params.push(rate.id);
        finalRate = Number(rate.base_price_per_m2);
        finalCurrency = rate.currency;
        updates.push('plan_name = ?');
        params.push(rate.name);
        updates.push('plan_min_days = ?');
        params.push(rate.min_days !== null ? Number(rate.min_days) : null);
        updates.push('plan_max_days = ?');
        params.push(rate.max_days !== null ? Number(rate.max_days) : null);
        recalcTotals = true;
      } else {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid pricing rate.' });
      }
    }

    if (canApplyPlanFields) {
      if (planName !== undefined) {
        const safePlanName = String(planName).trim();
        updates.push('plan_name = ?');
        params.push(safePlanName || null);
      }
      if (planMinDays !== undefined) {
        const safePlanMin = Number.isFinite(Number(planMinDays)) ? Number(planMinDays) : null;
        updates.push('plan_min_days = ?');
        params.push(safePlanMin);
      }
      if (planMaxDays !== undefined) {
        const safePlanMax = Number.isFinite(Number(planMaxDays)) ? Number(planMaxDays) : null;
        updates.push('plan_max_days = ?');
        params.push(safePlanMax);
      }
    }

    if (recalcTotals) {
      baseCost = roundMoney(finalCovered * finalFloors * finalRate);
      updates.push('area_m2 = ?');
      params.push(finalArea);
      updates.push('base_rate_per_m2 = ?');
      params.push(finalRate);
      updates.push('base_cost = ?');
      params.push(baseCost);
    }

    if (finalCurrency) {
      updates.push('currency = ?');
      params.push(finalCurrency);
    }

    if (parsedArea !== undefined || parsedUncovered !== undefined || parsedCovered !== undefined) {
      updates.push('area_covered_m2 = ?');
      params.push(finalCovered);
      if (parsedUncovered === undefined && quote.area_uncovered_percent === null) {
        updates.push('area_uncovered_percent = ?');
        params.push(finalUncovered);
      }
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
