const fs = require('fs');

let code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', 'utf8');
code = code.replace(/rateLimiters\.moderate/g, "orderLimiter");
fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\order.routes.ts', code);

code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\expense.routes.ts', 'utf8');
code = code.replace(/approvedById:\s*data\.approvedById,/g, "...(data.approvedById ? { approvedBy: { connect: { id: data.approvedById } } } : {})");
fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\expense.routes.ts', code);
