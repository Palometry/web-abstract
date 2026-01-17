import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const servicesRouter = Router();

servicesRouter.use(authenticate);

servicesRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, description, icon, display_order, is_public, is_addon,
            pricing_type, price, currency, is_active
     FROM services
     ORDER BY display_order ASC, id ASC`
  );

  const services = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        displayOrder: row.display_order,
        public: !!row.is_public,
        isAddon: !!row.is_addon,
        pricingType: row.pricing_type,
        price: Number(row.price),
        currency: row.currency,
        isActive: !!row.is_active
      }))
    : [];

  return res.json(services);
});

servicesRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const {
    name,
    description,
    icon,
    displayOrder,
    isPublic,
    isAddon,
    pricingType,
    price,
    currency,
    isActive
  } = req.body as {
    name?: string;
    description?: string;
    icon?: string | null;
    displayOrder?: number;
    isPublic?: boolean;
    isAddon?: boolean;
    pricingType?: 'flat' | 'per_m2' | 'percent';
    price?: number;
    currency?: string;
    isActive?: boolean;
  };

  const safeName = (name ?? '').trim();
  const safeDescription = (description ?? '').trim();
  if (!safeName || !safeDescription) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }

  const allowedPricing = new Set(['flat', 'per_m2', 'percent']);
  const safePricingType = pricingType ?? 'flat';
  if (!allowedPricing.has(safePricingType)) {
    return res.status(400).json({ error: 'Invalid pricing type.' });
  }

  const safePrice = Number(price);
  if (!Number.isFinite(safePrice) || safePrice < 0) {
    return res.status(400).json({ error: 'Price must be 0 or greater.' });
  }

  const safeCurrency = (currency ?? 'PEN').toString().toUpperCase();
  const safeDisplayOrder = Number(displayOrder);
  const finalDisplayOrder = Number.isFinite(safeDisplayOrder) ? safeDisplayOrder : 0;

  const [result] = await db.query(
    `INSERT INTO services (
      name, description, icon, display_order, is_public, is_addon,
      pricing_type, price, currency, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      safeName,
      safeDescription,
      icon ?? null,
      finalDisplayOrder,
      isPublic === false ? 0 : 1,
      isAddon ? 1 : 0,
      safePricingType,
      safePrice,
      safeCurrency,
      isActive === false ? 0 : 1
    ]
  );

  return res.status(201).json({ id: (result as any).insertId });
});

servicesRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const serviceId = Number(req.params['id']);
  if (!Number.isFinite(serviceId)) {
    return res.status(400).json({ error: 'Invalid service id.' });
  }

  const {
    name,
    description,
    icon,
    displayOrder,
    isPublic,
    isAddon,
    pricingType,
    price,
    currency,
    isActive
  } = req.body as {
    name?: string;
    description?: string;
    icon?: string | null;
    displayOrder?: number;
    isPublic?: boolean;
    isAddon?: boolean;
    pricingType?: 'flat' | 'per_m2' | 'percent';
    price?: number;
    currency?: string;
    isActive?: boolean;
  };

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (name !== undefined) {
    const safeName = String(name).trim();
    if (!safeName) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    updates.push('name = ?');
    params.push(safeName);
  }
  if (description !== undefined) {
    const safeDescription = String(description).trim();
    if (!safeDescription) {
      return res.status(400).json({ error: 'Description cannot be empty.' });
    }
    updates.push('description = ?');
    params.push(safeDescription);
  }
  if (icon !== undefined) {
    updates.push('icon = ?');
    params.push(icon);
  }
  if (displayOrder !== undefined) {
    const safeDisplayOrder = Number(displayOrder);
    if (!Number.isFinite(safeDisplayOrder)) {
      return res.status(400).json({ error: 'Invalid displayOrder.' });
    }
    updates.push('display_order = ?');
    params.push(safeDisplayOrder);
  }
  if (isPublic !== undefined) {
    updates.push('is_public = ?');
    params.push(isPublic ? 1 : 0);
  }
  if (isAddon !== undefined) {
    updates.push('is_addon = ?');
    params.push(isAddon ? 1 : 0);
  }
  if (pricingType !== undefined) {
    const allowedPricing = new Set(['flat', 'per_m2', 'percent']);
    if (!allowedPricing.has(pricingType)) {
      return res.status(400).json({ error: 'Invalid pricing type.' });
    }
    updates.push('pricing_type = ?');
    params.push(pricingType);
  }
  if (price !== undefined) {
    const safePrice = Number(price);
    if (!Number.isFinite(safePrice) || safePrice < 0) {
      return res.status(400).json({ error: 'Invalid price.' });
    }
    updates.push('price = ?');
    params.push(safePrice);
  }
  if (currency !== undefined) {
    const safeCurrency = String(currency).toUpperCase();
    updates.push('currency = ?');
    params.push(safeCurrency);
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const [result] = await db.query(
    `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
    [...params, serviceId]
  );
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'Service not found.' });
  }
  return res.json({ ok: true });
});

servicesRouter.delete('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const serviceId = Number(req.params['id']);
  if (!Number.isFinite(serviceId)) {
    return res.status(400).json({ error: 'Invalid service id.' });
  }

  const [result] = await db.query(
    'UPDATE services SET is_active = 0, is_public = 0 WHERE id = ?',
    [serviceId]
  );
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'Service not found.' });
  }
  return res.status(204).send();
});
