import { Hono } from 'hono';
import { getDb } from '../db.js';
import { products } from 'mango-farm-database';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

type Bindings = {
  DATABASE_URL: string;
};

type Variables = {
  requestId: string;
};

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const productCreateSchema = z.object({
  name: z.string(),
  sku: z.string(),
  product_type: z.string(),
  variety: z.string().optional(),
  description: z.string().optional(),
  price: z.number(),
  unit_of_measure: z.string(),
  featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// GET /api/v1/products
router.get('/', async (c) => {
  try {
    const dbUrl = c.env.DATABASE_URL;
    if (!dbUrl) {
      // Return seed mock data if database is not bound yet
      return c.json({
        data: [
          {
            id: 'product_001',
            name: 'Premium Kent Mango (Mock)',
            sku: 'MNG-KENT-001',
            product_type: 'fresh_fruit',
            variety: 'Kent',
            description: 'Large, fiberless export-grade mangoes with excellent shelf life.',
            price: 8500,
            unit_of_measure: 'kg',
            featured: true,
            is_active: true,
            created_date: '2026-07-01T09:00:00.000Z',
          },
          {
            id: 'product_002',
            name: 'Dried Mango Slices (Mock)',
            sku: 'MNG-DRIED-002',
            product_type: 'dried',
            variety: 'Mixed',
            description: 'Naturally dried mango slices packed for retail and wholesale.',
            price: 28000,
            unit_of_measure: 'pack',
            featured: true,
            is_active: true,
            created_date: '2026-07-02T09:00:00.000Z',
          }
        ],
        requestId: c.get('requestId')
      });
    }

    const db = getDb(dbUrl);
    const result = await db.select().from(products).orderBy(desc(products.createdAt));
    
    // Map database properties back to camelCase/snakeCase expected by frontend
    const mapped = result.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      product_type: item.productType,
      variety: item.variety,
      description: item.description,
      price: item.price,
      unit_of_measure: item.unitOfMeasure,
      featured: item.featured,
      is_active: item.isActive,
      created_date: item.createdAt.toISOString(),
      updated_date: item.updatedAt.toISOString(),
    }));

    return c.json({ data: mapped, requestId: c.get('requestId') });
  } catch (error: any) {
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      requestId: c.get('requestId')
    }, 500);
  }
});

// POST /api/v1/products
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload parameters',
          details: parsed.error.issues
        },
        requestId: c.get('requestId')
      }, 422);
    }

    const dbUrl = c.env.DATABASE_URL;
    const newId = `product_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    
    if (!dbUrl) {
      return c.json({
        data: {
          id: newId,
          ...parsed.data,
          created_date: nowIso,
          updated_date: nowIso,
        },
        requestId: c.get('requestId')
      });
    }

    const db = getDb(dbUrl);
    await db.insert(products).values({
      id: newId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      productType: parsed.data.product_type,
      variety: parsed.data.variety || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      unitOfMeasure: parsed.data.unit_of_measure,
      featured: parsed.data.featured,
      isActive: parsed.data.is_active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({
      data: {
        id: newId,
        ...parsed.data,
        created_date: nowIso,
        updated_date: nowIso,
      },
      requestId: c.get('requestId')
    });
  } catch (error: any) {
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      requestId: c.get('requestId')
    }, 500);
  }
});

export default router;
