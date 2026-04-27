const fs = require('fs');
let code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', 'utf8');

const regex1 = /router\.post\('\/:id\/payment', authenticate, async \(req: AuthRequest, res: Response, next: NextFunction\) => {\r?\n\s+try {\r?\n\s+const \{\s+method,\s+amount,\s+reference,\s+notes,\r?\n\s+cashReceived,\r?\n\s+cardLastFour,\r?\n\s+transferReference,\r?\n\s+discountAmount,\r?\n\s+discountPercent,\r?\n\s+\} = req\.body;/;

const replacement1 = `router.post('/:id/payment', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentSchema = z.object({
      method: z.string(),
      amount: z.number().positive('Payment amount must be greater than zero'),
      reference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      cashReceived: z.union([z.number(), z.string().transform(v => Number(v))]).optional().nullable(),
      cardLastFour: z.string().optional().nullable(),
      transferReference: z.string().optional().nullable(),
      discountAmount: z.number().optional().nullable(),
      discountPercent: z.number().optional().nullable(),
    });
    
    const { 
      method, 
      amount, 
      reference, 
      notes,
      cashReceived,
      cardLastFour,
      transferReference,
      discountAmount,
      discountPercent,
    } = paymentSchema.parse(req.body);`;

const regex2 = /const paidAmount = Number\(order\.paidAmount\) \+ amount;\r?\n\r?\n\s+\/\/ Build payment notes with additional details/;
const replacement2 = `const paidAmount = Number(order.paidAmount) + amount;

      if (paidAmount > finalTotalAmount && method !== 'CASH') {
        throw new AppError('Payment amount exceeds order total', 400);
      }

      // Build payment notes with additional details`;

const regex3 = /include:\s*{\s*items:\s*{\s*include:\s*{\s*menuItem:\s*true,?\s*},\s*},\s*table:\s*true,\s*customer:\s*true,\s*cashier:\s*{\s*select:\s*{\s*id:\s*true,\s*fullName:\s*true\s*},?\s*},\s*delivery:\s*true,\s*payments:\s*true,?\s*}/g;
const replacement3 = `select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          subtotal: true,
          totalAmount: true,
          paidAmount: true,
          orderedAt: true,
          table: { select: { number: true, status: true } },
          customer: { select: { firstName: true, lastName: true } },
          cashier: { select: { fullName: true } }
        }`;

code = code.replace(regex1, replacement1);
code = code.replace(regex2, replacement2);
code = code.replace(regex3, replacement3);

fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', code);
