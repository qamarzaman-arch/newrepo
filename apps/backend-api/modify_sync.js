const fs = require('fs');
let code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\sync.routes.ts', 'utf8');

const regexProcess = /await prisma\.syncQueue\.update\(\{\r?\n\s+where: \{ id: op\.id \},\r?\n\s+data: \{ status: 'completed', syncedAt: new Date\(\) \},\r?\n\s+\}\);/g;

const replacementProcess = `const payloadObj = typeof op.payload === 'string' ? JSON.parse(op.payload) : op.payload;
        const modelNameMap: Record<string, string> = {
          'Order': 'order',
          'OrderItem': 'orderItem',
          'Payment': 'payment',
          'Customer': 'customer',
          'CashDrawer': 'cashDrawer'
        };
        const safeModelName = modelNameMap[op.modelName] || op.modelName.charAt(0).toLowerCase() + op.modelName.slice(1);
        const modelDelegate = (prisma as any)[safeModelName];

        if (!modelDelegate) throw new Error(\`Unknown model \${op.modelName}\`);

        // Strip unsupported relational nested arrays if needed, basic implementation handles flat tables primarily
        if (op.operation === 'CREATE') {
          // Check if exists
          const existing = await modelDelegate.findUnique({ where: { id: op.recordId } });
          if (!existing) {
             await modelDelegate.create({ data: payloadObj });
          } else {
             await modelDelegate.update({ where: { id: op.recordId }, data: payloadObj });
          }
        } else if (op.operation === 'UPDATE') {
          await modelDelegate.update({ where: { id: op.recordId }, data: payloadObj });
        } else if (op.operation === 'DELETE') {
          await modelDelegate.delete({ where: { id: op.recordId } }).catch((_e: any) => {});
        }

        await prisma.syncQueue.update({
          where: { id: op.id },
          data: { status: 'completed', syncedAt: new Date() },
        });`;

code = code.replace(regexProcess, replacementProcess);

fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\src\\routes\\sync.routes.ts', code);
