const fs = require('fs');

// order.routes.ts
let code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', 'utf8');
code = code.replace(/import \{ rateLimiters \} from '\.\.\/middleware\/rateLimiter';/g, "import { orderLimiter } from '../middleware/rateLimiter';");
code = code.replace(/rateLimiters\.order/g, "orderLimiter");
fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', code);

// payment.routes.ts
code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\payment.routes.ts', 'utf8');
code = code.replace(/import \{ rateLimiters \} from '\.\.\/middleware\/rateLimiter';/g, "import { paymentLimiter } from '../middleware/rateLimiter';");
code = code.replace(/rateLimiters\.moderate/g, "paymentLimiter");
fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\payment.routes.ts', code);

// report.routes.ts
code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\report.routes.ts', 'utf8');
code = code.replace(/getOrderNetPaidAmount/g, "getOrderPaidAmount");
code = code.replace(/totalRevenue/g, "totalSales");
fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\report.routes.ts', code);
